import { Card, Modal } from 'antd';
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import CompareView from './components/compare-view';
import ControlPanel from './components/control-panel';
import EnvPanel from './components/env-panel';
import StageContainer from './components/stage-container';
import StatusPanel from './components/status-panel';
import styles from './index.module.less';
import { averageSamples } from './index.types';
import DomPerformanceTest from './metrics/dom';
import WidgetPerformanceTest from './metrics/widget';

import type { RefObject } from 'react';
import type {
  ExperimentType,
  PerformanceTestInterface,
  TestResult,
  TestSample,
} from './index.types';

type LoadedTest = { name: string; create: (stage: HTMLElement) => PerformanceTestInterface };

type ProgressItem = {
  key: string;
  name: string;
  status: 'pending' | 'running' | 'done';
  current: number;
  total: number;
};

function listTests(layout: 'absolute' | 'flex' | 'text'): LoadedTest[] {
  return [
    { name: `${layout}-DOM`, create: (stage) => new DomPerformanceTest(stage, layout) },
    { name: `${layout}-Widget`, create: (stage) => new WidgetPerformanceTest(stage, layout) },
  ];
}

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
    po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const e of entries as any) {
        const d = (e.duration as number) || 0;
        longTaskDuration += d;
      }
    });
    po.observe({ entryTypes: ['longtask'] as any });
  } catch { }
  for (let i = 1; i <= total; i++) {
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
    } catch { }
  }
  const windowMs = Math.max(1, winEnd - winStart);
  const cpuBusyPercent = Math.min(100, (longTaskDuration / windowMs) * 100);
  avg.metrics.cpuBusyPercent = cpuBusyPercent;
  return { name: label, mode: 'compare' as any, samples, average: avg };
}

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
  const [layoutType, setLayoutType] = useState<'absolute' | 'flex' | 'text'>('absolute');
  const [experimentType, setExperimentType] = useState<ExperimentType>('dom_vs_widget');
  const [baselineResults, setBaselineResults] = useState<TestResult[] | null>(null);
  const [thresholdPercent, setThresholdPercent] = useState<number>(0.05);
  const [runSeq, setRunSeq] = useState<number>(0);
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
    const tests = listTests(layoutType);
    setProgressItems(
      tests.map((t) => ({
        key: t.name,
        name: t.name,
        status: 'pending',
        current: 0,
        total: nodeCounts.length * repeat,
      })),
    );
    setModalProgressItems(
      tests.map((t) => ({
        key: t.name,
        name: t.name,
        status: 'pending',
        current: 0,
        total: nodeCounts.length * repeat,
      })),
    );
    const list: TestResult[] = [];
    {
      const warm = tests[0];
      const inst = warm.create(stage);
      await runSingleWithProgress(inst, warm.name, 50, 1, () => { });
    }
    for (const t of tests) {
      const inst = t.create(stage);
      let done = 0;
      for (const n of nodeCounts) {
        if (cancelled.current) {
          break;
        }
        setProgressItems((prev) =>
          prev.map((it) => (it.key === t.name ? { ...it, status: 'running' } : it)),
        );
        setModalProgressItems((prev) =>
          prev.map((it) => (it.key === t.name ? { ...it, status: 'running' } : it)),
        );
        const res = await runSingleWithProgress(inst, t.name, n, repeat, (i, total) => {
          setCurrentTask({
            name: t.name,
            round: i,
            total,
          });
          setProgressItems((prev) =>
            prev.map((it) =>
              it.key === t.name
                ? {
                  ...it,
                  status: 'running',
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
                  status: 'running',
                  current: Math.min(done + i, it.total),
                }
                : it,
            ),
          );
        });
        list.push(res);
        done += repeat;
        setProgressItems((prev) =>
          prev.map((it) =>
            it.key === t.name
              ? {
                ...it,
                status: done === it.total ? 'done' : 'running',
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
                status: done === it.total ? 'done' : 'running',
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
    setModalProgressItems((prev) => prev.map((it) => ({ ...it, status: 'pending', current: 0 })));
  };

  const stop = () => {
    cancelled.current = true;
    setCurrentTask(null);
    setLoading(false);
    setShowStage(false);
    setModalProgressItems((prev) => prev.map((it) => ({ ...it, status: 'pending', current: 0 })));
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
    layoutType,
    setLayoutType,
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
    layoutType,
    setLayoutType,
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
            nodeCounts={nodeCounts}
            setNodeCounts={setNodeCounts}
            repeat={repeat}
            setRepeat={setRepeat}
            start={start}
            stop={stop}
            loading={loading}
            layoutType={layoutType}
            setLayoutType={setLayoutType}
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
