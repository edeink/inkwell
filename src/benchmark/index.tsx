import { Card, Modal } from 'antd';
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import CompareView from './components/compare-view';
import ControlPanel from './components/control-panel';
import EnvPanel from './components/env-panel';
import StageContainer from './components/stage-container';
import StatusPanel from './components/status-panel';
import styles from './index.module.less';
import {
  averageSamples,
  TestCaseType,
  TestStatus,
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
 */
function listTests(caseType: TestCaseType): LoadedTest[] {
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
  onProgress: (i: number, total: number) => void,
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
      for (const e of entries as any) {
        const d = (e.duration as number) || 0;
        longTaskDuration += d;
      }
    });
    po.observe({ entryTypes: ['longtask'] as any });
  } catch {}
  for (let i = 1; i <= total; i++) {
    // 每轮：采集 → 构建 → 再采集，形成完整样本
    await test.collectStatistics(nodes);
    await test.createNodes(nodes);
    await test.collectStatistics(nodes);
    const memory = test.getMemoryUsage();
    const metrics = test.getPerformanceMetrics();
    const frames = test.getFrameRate();
    samples.push({ memory, metrics, frames });
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
  return { name: label, mode: 'compare' as any, samples, average: avg };
}

/**
 * useRunAll
 * 管理整套基准测试的状态、生命周期与进度，同步外部面板与模态框的进度展示。
 *
 * @param stageRef 舞台容器的引用，供测试场景创建与渲染使用
 * @returns 运行状态、结果与控制方法集合
 */
function useRunAll(stageRef: RefObject<HTMLDivElement>) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [currentTask, setCurrentTask] = useState<{
    name: string;
    round: number;
    total: number;
  } | null>(null);
  const [showStage, setShowStage] = useState(false);
  const [nodeCounts, setNodeCounts] = useState<number[]>([100, 500, 1000, 5000, 10000]);
  const [repeat, setRepeat] = useState<number>(3);
  const [caseType, setCaseType] = useState<TestCaseType>(TestCaseType.Text);
  const [experimentType, setExperimentType] = useState<ExperimentType>('dom_vs_widget');
  const [baselineResults, setBaselineResults] = useState<TestResult[] | null>(null);
  const [thresholdPercent, setThresholdPercent] = useState<number>(0.05);
  const [runSeq, setRunSeq] = useState<number>(0);
  // 独立的模态框进度：避免重置外部状态面板的历史
  const [modalProgressItems, setModalProgressItems] = useState<ProgressItem[]>([]);
  const cancelled = useRef(false);

  const start = async () => {
    setLoading(true);
    cancelled.current = false;
    setShowStage(true);
    setRunSeq((x) => x + 1);
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
    const tests = listTests(caseType);
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
      const inst = warm.create(stage);
      // 预热一轮以降低冷启动对后续统计的干扰
      await runSingleWithProgress(inst, warm.name, 50, 1, () => {});
    }
    for (const t of tests) {
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
        const res = await runSingleWithProgress(inst, t.name, n, repeat, (i, total) => {
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
        });
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

  const stop = () => {
    cancelled.current = true;
    setCurrentTask(null);
    setLoading(false);
    setShowStage(false);
    // 即刻重置模态框进度（外部面板不重置）
    setModalProgressItems((prev) =>
      prev.map((it) => ({ ...it, status: TestStatus.Pending, current: 0 })),
    );
  };

  return {
    loading,
    results,
    start,
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
    runSeq,
    modalProgressItems,
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
    results,
    start,
    stop,
    progressItems,
    currentTask,
    showStage,
    nodeCounts,
    setNodeCounts,
    caseType,
    setCaseType,
    experimentType,
    setExperimentType,
    baselineResults,
    setBaselineResults,
    thresholdPercent,
    runSeq,
    modalProgressItems,
  } = useRunAll(stageRef as React.RefObject<HTMLDivElement>);

  const [repeat, setRepeat] = useState<number>(3);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Card size="small" variant="outlined">
          <EnvPanel />
        </Card>
        <Card size="small" variant="outlined">
          <StatusPanel items={progressItems} current={currentTask} />
        </Card>
        <Card size="small" variant="outlined">
          <ControlPanel
            setNodeCounts={setNodeCounts}
            repeat={repeat}
            setRepeat={setRepeat}
            start={start}
            stop={stop}
            loading={loading}
            caseType={caseType}
            setCaseType={setCaseType}
          />
        </Card>
      </div>
      <Card size="small" variant="outlined">
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
      </Card>
      <Modal
        open={showStage}
        footer={null}
        centered
        maskClosable={false}
        width="100vw"
        styles={{
          body: {
            padding: 0,
          },
        }}
        onCancel={stop}
      >
        <div className={styles.modalHeader}>
          <StatusPanel compact runSeq={runSeq} items={modalProgressItems} current={currentTask} />
        </div>
        <StageContainer ref={stageRef} />
        <div className={styles.modalFooter}>
          <button className={styles.stopBtn} onClick={stop}>
            终止
          </button>
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

mount();
export default App;
