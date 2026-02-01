import { Button, Modal, Space } from '@/ui';
import { PauseCircleOutlined, PlayCircleOutlined, StopOutlined } from '@/ui/icons';

import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import '../styles/colors.css';
import CanvasReport from './components/canvas-report';
import CompareView from './components/compare-view';
import ControlPanel from './components/control-panel';
import EnvPanel from './components/env-panel';
import StageContainer from './components/stage-container';
import StatusPanel from './components/status-panel';
import styles from './index.module.less';
import {
  averageSamples,
  TestCaseType,
  TestMode,
  TestStatus,
  type BenchmarkConfig,
  type ExperimentType,
  type PerformanceTestInterface,
  type TestResult,
  type TestSample,
} from './index.types';
import DomPerformanceTest from './metrics/dom';
import WidgetPerformanceTest from './metrics/widget';

import type { RefObject } from 'react';

/**
 * 已加载测试描述：名称与工厂方法（基于舞台元素创建具体测试实例）。
 */
type LoadedTest = {
  name: string;
  create: (stage: HTMLElement) => PerformanceTestInterface;
};

/**
 * 进度项：用于状态面板与模态框展示测试总体进度。
 */
type ProgressItem = {
  key: string;
  name: string;
  status: TestStatus;
  current: number;
  total: number;
};

/**
 * 根据布局类型生成 DOM 与 Widget 两类测试用例集合。
 * 注意：已确保 Absolute 和 Flex 类型的 DOM 与 Widget 实现逻辑在测试结构、元素尺寸和布局属性上保持一致。
 * - Absolute: 均使用随机坐标分布 4x4 元素。
 * - Flex: 均使用 Wrap/FlexWrap 布局，4x4 元素，间距 4px。
 */
function listTests(caseType: TestCaseType, mode: 'benchmark' | 'canvas'): LoadedTest[] {
  // Canvas 模式：仅运行 Widget 测试，且名称简化
  if (mode === 'canvas') {
    if (caseType === TestCaseType.CanvasBenchmark) {
      return [
        {
          name: 'Canvas-Pure',
          create: (stage) => new WidgetPerformanceTest(stage, caseType),
        },
      ];
    }
    if (caseType === TestCaseType.Text) {
      return [
        {
          name: 'Text-Widget',
          create: (stage) => new WidgetPerformanceTest(stage, caseType, 'v1'),
        },
      ];
    }
    return [
      {
        name: `${caseType}-Widget`,
        create: (stage) => new WidgetPerformanceTest(stage, caseType),
      },
    ];
  }

  if (caseType === TestCaseType.Text) {
    return [
      { name: 'text-DOM', create: (stage) => new DomPerformanceTest(stage, caseType) },
      {
        name: 'text-Widget-v1',
        create: (stage) => new WidgetPerformanceTest(stage, caseType, 'v1'),
      },
    ];
  }
  return [
    { name: `${caseType}-DOM`, create: (stage) => new DomPerformanceTest(stage, caseType) },
    { name: `${caseType}-Widget`, create: (stage) => new WidgetPerformanceTest(stage, caseType) },
  ];
}

/**
 * 执行单个测试（指定节点规模与重复次数），并在每轮结束时回调进度。
 *
 * 关键逻辑：
 * - 使用 PerformanceObserver 监听 Long Task 总时长，估算 CPU 忙碌百分比；
 * - 每次 createNodes 前后收集统计，得到内存与帧率样本；
 * - 通过 onProgress(i,total) 对外报告进度。
 *
 * @param test 基于接口的性能测试实例
 * @param label 测试结果名称标识
 * @param nodes 节点规模
 * @param repeat 重复次数
 * @param onProgress 进度回调，参数为当前轮次与总轮次
 * @returns 测试结果（包含样本列表与平均样本）
 */
async function runSingleWithProgress(
  test: PerformanceTestInterface,
  label: string,
  nodes: number,
  repeat: number,
  config: BenchmarkConfig,
  onProgress: (i: number, total: number) => void,
  waitIfPaused?: () => Promise<void>,
): Promise<TestResult> {
  const samples: TestSample[] = [];
  const total = repeat;
  let longTaskDuration = 0;
  const winStart = performance.now();
  let po: PerformanceObserver | null = null;
  try {
    // 监听 Long Task（>50ms）以累计主线程阻塞总时长
    po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const e of entries) {
        const d = (e.duration as number) || 0;
        longTaskDuration += d;
      }
    });
    po.observe({ entryTypes: ['longtask'] });
  } catch {}
  for (let i = 1; i <= total; i++) {
    // 每轮：采集 → 构建 → 再采集，形成完整样本
    if (waitIfPaused) {
      await waitIfPaused();
    }
    await test.collectStatistics(nodes);
    if (waitIfPaused) {
      await waitIfPaused();
    }
    await test.createNodes(nodes);
    if (waitIfPaused) {
      await waitIfPaused();
    }
    await test.collectStatistics(nodes);
    const memory = test.getMemoryUsage();
    const metrics = test.getPerformanceMetrics();
    const frames = test.getFrameRate();
    // 获取滚动指标（如果有）
    const scrollMetrics = test.getScrollMetrics ? test.getScrollMetrics() : undefined;
    samples.push({ memory, metrics, frames, scrollMetrics });
    onProgress(i, total);
  }
  const avg = averageSamples(samples);
  const winEnd = performance.now();
  if (po) {
    try {
      po.disconnect();
    } catch {}
  }
  const windowMs = Math.max(1, winEnd - winStart); // 观测窗口时长
  const cpuBusyPercent = Math.min(100, (longTaskDuration / windowMs) * 100); // 估算 CPU 忙碌比例
  avg.metrics.cpuBusyPercent = cpuBusyPercent;
  return { name: label, mode: TestMode.Baseline, config, samples, average: avg };
}

const DELAY_TIME = 300;

/**
 * useRunAll
 * 管理整套基准测试的状态、生命周期与进度，同步外部面板与模态框的进度展示。
 *
 * @param stageRef 舞台容器的引用，供测试场景创建与渲染使用
 * @returns 运行状态、结果与控制方法集合
 */
function useRunAll(stageRef: RefObject<HTMLDivElement>) {
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [currentTask, setCurrentTask] = useState<{
    name: string;
    round: number;
    total: number;
  } | null>(null);
  const [showStage, setShowStage] = useState(false);
  const [nodeCounts, setNodeCounts] = useState<number[]>([100, 500, 1000, 5000, 10000]);
  const [repeat, setRepeat] = useState<number>(1);
  const [caseType, setCaseType] = useState<TestCaseType>(TestCaseType.Absolute);
  const [experimentType, setExperimentType] = useState<ExperimentType>('dom_vs_widget');
  const [baselineResults, setBaselineResults] = useState<TestResult[] | null>(null);
  const [thresholdPercent, setThresholdPercent] = useState<number>(0.05);
  // 独立的模态框进度：避免重置外部状态面板的历史
  const [modalProgressItems, setModalProgressItems] = useState<ProgressItem[]>([]);
  const cancelled = useRef(false);
  const [testMode, setTestMode] = useState<'benchmark' | 'canvas'>('benchmark');
  const [testStep, setTestStep] = useState<number>(10);
  const [scale, setScale] = useState<number>(1.0);

  const waitIfPaused = async () => {
    // 简单等待机制：暂停时阻塞流程直到恢复
    while (pausedRef.current) {
      await new Promise<void>((resolve) => setTimeout(resolve, 60));
    }
  };

  const start = async () => {
    setLoading(true);
    setPaused(false);
    pausedRef.current = false;
    cancelled.current = false;
    setShowStage(true);
    let stage: HTMLDivElement | null = null;
    for (let i = 0; i < 5; i++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      stage = stageRef.current;
      if (stage) {
        break;
      }
    }
    if (!stage) {
      setLoading(false);
      throw new Error('stage ref not ready');
    }

    // 延迟启动，确保 DOM 完全就绪
    await new Promise((resolve) => setTimeout(resolve, DELAY_TIME));

    const tests = listTests(caseType, testMode);
    // 随机化测试顺序，避免固定顺序带来的潜在偏差
    // if (Math.random() > 0.5) {
    //   tests.reverse();
    // }

    // 初始化外部与模态框的进度列表
    setProgressItems(
      tests.map((t) => ({
        key: t.name,
        name: t.name,
        status: TestStatus.Pending,
        current: 0,
        total: nodeCounts.length * repeat,
      })),
    );
    setModalProgressItems(
      tests.map((t) => ({
        key: t.name,
        name: t.name,
        status: TestStatus.Pending,
        current: 0,
        total: nodeCounts.length * repeat,
      })),
    );
    const list: TestResult[] = [];
    {
      const warm = tests[0];
      // 确保环境隔离：清理舞台
      if (stage) {
        stage.innerHTML = '';
      }
      const inst = warm.create(stage);
      // 预热一轮以降低冷启动对后续统计的干扰
      const warmConfig: BenchmarkConfig = { iterationCount: 1 };
      const warmCount = nodeCounts.length > 0 ? nodeCounts[0] : 50;
      await runSingleWithProgress(inst, warm.name, warmCount, 1, warmConfig, () => {});
    }
    for (const t of tests) {
      // 确保环境隔离：清理舞台
      if (stage) {
        stage.innerHTML = '';
      }
      const inst = t.create(stage);
      let done = 0;
      for (const n of nodeCounts) {
        if (cancelled.current) {
          break;
        }
        // 标记当前测试为运行中
        setProgressItems((prev) =>
          prev.map((it) => (it.key === t.name ? { ...it, status: TestStatus.Running } : it)),
        );
        setModalProgressItems((prev) =>
          prev.map((it) => (it.key === t.name ? { ...it, status: TestStatus.Running } : it)),
        );
        const config: BenchmarkConfig = {
          iterationCount: repeat,
        };
        const res = await runSingleWithProgress(
          inst,
          t.name,
          n,
          repeat,
          config,
          (i: number, total: number) => {
            setCurrentTask({
              name: t.name,
              round: i,
              total,
            });
            // 进度按累积轮次计算，确保两处展示一致
            setProgressItems((prev) =>
              prev.map((it) =>
                it.key === t.name
                  ? {
                      ...it,
                      status: TestStatus.Running,
                      current: Math.min(done + i, it.total),
                    }
                  : it,
              ),
            );
            setModalProgressItems((prev) =>
              prev.map((it) =>
                it.key === t.name
                  ? {
                      ...it,
                      status: TestStatus.Running,
                      current: Math.min(done + i, it.total),
                    }
                  : it,
              ),
            );
          },
          waitIfPaused,
        );
        list.push(res);
        done += repeat;
        // 单个节点规模完成后更新状态与累积进度
        setProgressItems((prev) =>
          prev.map((it) =>
            it.key === t.name
              ? {
                  ...it,
                  status: done === it.total ? TestStatus.Done : TestStatus.Running,
                  current: done,
                }
              : it,
          ),
        );
        setModalProgressItems((prev) =>
          prev.map((it) =>
            it.key === t.name
              ? {
                  ...it,
                  status: done === it.total ? TestStatus.Done : TestStatus.Running,
                  current: done,
                }
              : it,
          ),
        );
      }
    }
    const expected = tests.length * nodeCounts.length;
    if (list.length !== expected) {
      console.warn('unexpected test result count', {
        expected,
        actual: list.length,
      });
    }
    setResults(list);
    setLoading(false);
    setShowStage(false);
    setCurrentTask(null);
    // 重置模态框进度，保留外部状态面板历史
    setModalProgressItems((prev) =>
      prev.map((it) => ({ ...it, status: TestStatus.Pending, current: 0 })),
    );
  };

  const pause = () => {
    setPaused(true);
    pausedRef.current = true;
  };

  const resume = () => {
    setPaused(false);
    pausedRef.current = false;
  };

  const stop = () => {
    cancelled.current = true;
    setCurrentTask(null);
    setLoading(false);
    setPaused(false);
    pausedRef.current = false;
    setShowStage(false);
    // 即刻重置模态框进度（外部面板不重置）
    setModalProgressItems((prev) =>
      prev.map((it) => ({ ...it, status: TestStatus.Pending, current: 0 })),
    );
  };

  return {
    loading,
    paused,
    results,
    start,
    pause,
    resume,
    stop,
    progressItems,
    currentTask,
    showStage,
    nodeCounts,
    setNodeCounts,
    repeat,
    setRepeat,
    caseType,
    setCaseType,
    experimentType,
    setExperimentType,
    baselineResults,
    setBaselineResults,
    thresholdPercent,
    setThresholdPercent,
    modalProgressItems,
    testMode,
    setTestMode,
    testStep,
    setTestStep,
    scale,
    setScale,
  };
}

/**
 * App
 * 页面主容器：汇总环境、状态、控制、对比视图与运行舞台。
 */
function App() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const {
    loading,
    paused,
    results,
    start,
    pause,
    resume,
    stop,
    progressItems,
    currentTask,
    showStage,
    setNodeCounts,
    caseType,
    setCaseType,
    experimentType,
    setExperimentType,
    baselineResults,
    setBaselineResults,
    thresholdPercent,
    modalProgressItems,
    testMode,
    setTestMode,
    repeat,
    setRepeat,
    // testStep,
    // setTestStep,
    // scale,
    // setScale,
  } = useRunAll(stageRef as React.RefObject<HTMLDivElement>);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <EnvPanel />
        </div>
        <div className={styles.toolbarRight}>
          <StatusPanel items={progressItems} current={currentTask} />
          <ControlPanel
            setNodeCounts={setNodeCounts}
            repeat={repeat}
            setRepeat={setRepeat}
            start={start}
            pause={pause}
            resume={resume}
            stop={stop}
            loading={loading}
            paused={paused}
            caseType={caseType}
            setCaseType={setCaseType}
            testMode={testMode}
            setTestMode={setTestMode}
          />
        </div>
      </div>
      {testMode === 'canvas' ? (
        <CanvasReport results={results} />
      ) : (
        <CompareView
          results={results}
          experimentType={experimentType}
          baseline={baselineResults}
          thresholdPercent={thresholdPercent}
          onToggleMode={() =>
            setExperimentType((m) => (m === 'dom_vs_widget' ? 'history' : 'dom_vs_widget'))
          }
          onUploadBaseline={(data) => setBaselineResults(data)}
        />
      )}
      <Modal
        open={showStage}
        footer={null}
        centered
        maskClosable={false}
        width="100vw"
        styles={{
          body: {
            padding: 0,
            backgroundColor: 'var(--ink-demo-bg-base)',
          },
          content: {
            backgroundColor: 'var(--ink-demo-bg-base)',
          },
          header: {
            backgroundColor: 'var(--ink-demo-bg-base)',
          },
        }}
        onCancel={stop}
      >
        <div className={styles.modalHeader}>
          <StatusPanel compact items={modalProgressItems} current={currentTask} />
        </div>
        <div className={styles.modalBodyWrap}>
          <StageContainer ref={stageRef} />
          <div className={styles.modalFooter}>
            <Space>
              <Button danger onClick={stop} icon={<StopOutlined />}>
                终止
              </Button>
              {!paused ? (
                <Button onClick={pause} type="primary" icon={<PauseCircleOutlined />}>
                  暂停
                </Button>
              ) : (
                <Button onClick={resume} type="primary" icon={<PlayCircleOutlined />}>
                  继续
                </Button>
              )}
            </Space>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/**
 * 应用挂载：在 #root 上创建 React 根并渲染。
 */
function mount() {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    return;
  }
  const root = createRoot(rootEl);
  root.render(<App />);
}

if (typeof document !== 'undefined' && document.getElementById('root')) {
  mount();
}
export default App;
export { App as BenchmarkApp };
