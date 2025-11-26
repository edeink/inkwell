import { Card, Modal } from 'antd';
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import Charts from './components/charts';
import ControlPanel from './components/control-panel';
import EnvPanel from './components/env-panel';
import StageContainer from './components/stage-container';
import StatusPanel from './components/status-panel';
import styles from './index.module.less';
import { averageSamples } from './index.types';
import DomPerformanceTest from './tester/dom';
import WidgetPerformanceTest from './tester/widget';

import type { PerformanceTestInterface, TestResult, TestSample } from './index.types';
import type { RefObject } from 'react';

type LoadedTest = { name: string; create: (stage: HTMLElement) => PerformanceTestInterface };

type ProgressItem = {
  key: string;
  name: string;
  status: 'pending' | 'running' | 'done';
  current: number;
  total: number;
};

function listTests(): LoadedTest[] {
  return [
    { name: 'DOM', create: (stage) => new DomPerformanceTest(stage) },
    { name: 'Widget', create: (stage) => new WidgetPerformanceTest(stage) },
  ];
}

async function runSingleWithProgress(
  test: PerformanceTestInterface,
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
  } catch {}
  for (let i = 1; i <= total; i++) {
    await test.createMassiveNodes(nodes);
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
  const windowMs = Math.max(1, winEnd - winStart);
  const cpuBusyPercent = Math.min(100, (longTaskDuration / windowMs) * 100);
  avg.metrics.cpuBusyPercent = cpuBusyPercent;
  return { name: test.name, mode: 'compare' as any, samples, average: avg };
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
  const cancelled = useRef(false);

  const start = async () => {
    setLoading(true);
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
    const tests = listTests();
    setProgressItems(
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
      const inst = tests[0].create(stage);
      await runSingleWithProgress(inst, 50, 1, () => {});
    }
    for (const t of tests) {
      const inst = t.create(stage);
      let done = 0;
      for (const n of nodeCounts) {
        if (cancelled.current) {
          break;
        }
        const res = await runSingleWithProgress(inst, n, repeat, (i, total) => {
          setCurrentTask({
            name: inst.name,
            round: i,
            total,
          });
          setProgressItems((prev) =>
            prev.map((it) =>
              it.key === inst.name
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
            it.key === inst.name
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
  };

  const stop = () => {
    cancelled.current = true;
    setLoading(false);
    setShowStage(false);
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
          />
        </Card>
      </div>
      <Card size="small" variant="outlined">
        <Charts results={results} />
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <StageContainer ref={stageRef} />
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
