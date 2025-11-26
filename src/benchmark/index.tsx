import { Button, Modal, Select, Space } from 'antd';
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import Charts from './components/charts';
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
    {
      name: 'DOM',
      create: (stage) => new DomPerformanceTest(stage),
    },
    {
      name: 'Widget',
      create: (stage) => new WidgetPerformanceTest(stage),
    },
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
  for (let i = 1; i <= total; i++) {
    await test.createMassiveNodes(nodes);
    const memory = test.getMemoryUsage();
    const metrics = test.getPerformanceMetrics();
    const frames = test.getFrameRate();
    samples.push({
      memory,
      metrics,
      frames,
    });
    onProgress(i, total);
  }
  const avg = averageSamples(samples);
  return {
    name: test.name,
    mode: 'compare' as any,
    samples,
    average: avg,
  };
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

  return (
    <div>
      <div className={styles.headerRow}>
        <EnvPanel />
        <StatusPanel items={progressItems} current={currentTask} />
        <Space direction="vertical" size={8}>
          <Select
            style={{
              width: 240,
            }}
            value={nodeCounts.map(String)}
            mode="multiple"
            options={[100, 500, 1000, 5000, 10000].map((n) => ({
              label: `${n} 节点`,
              value: String(n),
            }))}
            onChange={(vals) =>
              setNodeCounts(
                vals
                  .map((v) => Number(v))
                  .filter((v) => !Number.isNaN(v))
                  .sort((a, b) => a - b),
              )
            }
          />
          <Space>
            <Button type="primary" onClick={start} disabled={loading}>
              运行测试
            </Button>
            <Button danger onClick={stop} disabled={!loading}>
              停止
            </Button>
          </Space>
        </Space>
      </div>
      <Charts results={results} />
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
