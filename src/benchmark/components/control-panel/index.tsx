import { PauseCircleOutlined, PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import { Button, InputNumber, Select, Space, Tabs } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { TestCaseOptions, TestCaseType } from '../../index.types';

import styles from './index.module.less';

/**
 * 控制面板参数
 */
type Props = {
  setNodeCounts: (v: number[]) => void;
  repeat: number;
  setRepeat: (v: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  loading: boolean;
  paused?: boolean;
  caseType: TestCaseType;
  setCaseType: (v: TestCaseType) => void;
  testMode: 'benchmark' | 'canvas';
  setTestMode: (v: 'benchmark' | 'canvas') => void;
};

/**
 * 预设区间配置：用于快速选择测试规模。
 */
enum PresetType {
  Common = 'common',
  Small = 'small',
  Large = 'large',
}

type Preset = {
  key: PresetType;
  label: string;
};

// 预设集合：覆盖常用、小规模与大规模三档
const PRESETS: Preset[] = [
  { key: PresetType.Common, label: '常用' },
  { key: PresetType.Small, label: '小规模' },
  { key: PresetType.Large, label: '大规模' },
];

/**
 * 不同测试用例类型的参数配置
 * 目标：控制单次测试时间在 20-40s 范围内
 */
type CaseConfig = {
  start: number;
  end: number;
  step: number;
};

const CASE_CONFIGS: Record<TestCaseType, Record<PresetType, CaseConfig>> = {
  // 1. Layout 类 (Flex, Layout, Absolute, FlexRowCol) - 较快
  [TestCaseType.Flex]: {
    [PresetType.Small]: { start: 100, end: 1000, step: 20 },
    [PresetType.Common]: { start: 1000, end: 10000, step: 200 },
    [PresetType.Large]: { start: 10000, end: 50000, step: 1000 },
  },
  [TestCaseType.Layout]: {
    [PresetType.Small]: { start: 100, end: 1000, step: 20 },
    [PresetType.Common]: { start: 1000, end: 10000, step: 200 },
    [PresetType.Large]: { start: 10000, end: 50000, step: 1000 },
  },
  [TestCaseType.Absolute]: {
    [PresetType.Small]: { start: 100, end: 1000, step: 20 },
    [PresetType.Common]: { start: 1000, end: 10000, step: 200 },
    [PresetType.Large]: { start: 10000, end: 50000, step: 1000 },
  },
  [TestCaseType.FlexRowCol]: {
    [PresetType.Small]: { start: 100, end: 1000, step: 20 },
    [PresetType.Common]: { start: 1000, end: 10000, step: 200 },
    [PresetType.Large]: { start: 10000, end: 50000, step: 1000 },
  },

  // 2. Text 类 - 中等
  [TestCaseType.Text]: {
    [PresetType.Small]: { start: 50, end: 500, step: 10 },
    [PresetType.Common]: { start: 500, end: 5000, step: 100 },
    [PresetType.Large]: { start: 5000, end: 20000, step: 400 },
  },

  // 3. Scroll 类 - 较慢 (包含动画过程)
  [TestCaseType.Scroll]: {
    [PresetType.Small]: { start: 20, end: 200, step: 20 },
    [PresetType.Common]: { start: 200, end: 2000, step: 200 },
    [PresetType.Large]: { start: 2000, end: 10000, step: 1000 },
  },

  // 4. Pipeline/State 类 - 取决于复杂度，暂按中等处理
  [TestCaseType.Pipeline]: {
    [PresetType.Small]: { start: 50, end: 500, step: 50 },
    [PresetType.Common]: { start: 500, end: 5000, step: 500 },
    [PresetType.Large]: { start: 5000, end: 20000, step: 2000 },
  },
  [TestCaseType.State]: {
    [PresetType.Small]: { start: 50, end: 500, step: 50 },
    [PresetType.Common]: { start: 500, end: 5000, step: 500 },
    [PresetType.Large]: { start: 5000, end: 20000, step: 2000 },
  },
  [TestCaseType.CanvasBenchmark]: {
    [PresetType.Small]: { start: 100, end: 1000, step: 20 },
    [PresetType.Common]: { start: 1000, end: 10000, step: 200 },
    [PresetType.Large]: { start: 10000, end: 50000, step: 1000 },
  },
};

/**
 * ControlPanel
 * 提供布局选择、轮次与节点区间配置，并触发测试运行/停止。
 */
export default function ControlPanel({
  setNodeCounts,
  repeat,
  setRepeat,
  start,
  pause,
  resume,
  stop,
  loading,
  paused = false,
  caseType,
  setCaseType,
  testMode,
  setTestMode,
}: Props) {
  const [rangeStart, setRangeStart] = useState<number>(100);
  const [rangeEnd, setRangeEnd] = useState<number>(10000);
  const [rangeStep, setRangeStep] = useState<number>(100);
  const [preset, setPreset] = useState<PresetType>(PresetType.Common);
  const [runOnce] = useState(false);

  // Canvas 模式下的节点数
  const [canvasNodeCount, setCanvasNodeCount] = useState<number>(1000);

  // 根据 caseType 和 preset 获取配置
  const getConfig = useCallback((type: TestCaseType, pre: PresetType) => {
    return CASE_CONFIGS[type]?.[pre] || CASE_CONFIGS[TestCaseType.Absolute][pre];
  }, []);

  // 切换预设并同步区间与步长
  const onPresetChange = useCallback(
    (key: PresetType) => {
      setPreset(key);
      const cfg = getConfig(caseType, key);
      setRangeStart(cfg.start);
      setRangeEnd(cfg.end);
      setRangeStep(cfg.step);
    },
    [caseType, getConfig],
  );

  // 当 caseType 变化时，自动应用当前预设的配置
  useEffect(() => {
    const cfg = getConfig(caseType, preset);
    setRangeStart(cfg.start);
    setRangeEnd(cfg.end);
    setRangeStep(cfg.step);
  }, [caseType, preset, getConfig]);

  // 按区间与步长生成节点数列表，并写入上层状态
  const updateNodeCounts = useCallback(
    (s: number, e: number, step: number) => {
      if (!Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(step)) {
        return;
      }
      const si = Math.floor(s);
      const ei = Math.floor(e);
      const st = Math.floor(step);
      if (st <= 0 || si <= 0 || ei <= 0) {
        return;
      }
      if (si > ei) {
        return;
      }
      const list: number[] = [];
      for (let v = si; v <= ei; v += st) {
        list.push(v);
      }
      // 如果只运行一次（si == ei），确保包含该值
      if (list.length === 0 && si === ei) {
        list.push(si);
      }
      setNodeCounts(list);
    },
    [setNodeCounts],
  );

  // 当配置变化时，自动刷新节点列表
  useEffect(() => {
    if (testMode === 'canvas') {
      // Canvas 模式：单次执行，固定 repeat=1，节点数为 canvasNodeCount
      setRepeat(1);
      updateNodeCounts(canvasNodeCount, canvasNodeCount, 1);
    } else {
      // Benchmark 模式：根据 runOnce 决定
      if (runOnce) {
        updateNodeCounts(rangeStart, rangeStart, 1);
      } else {
        updateNodeCounts(rangeStart, rangeEnd, rangeStep);
      }
    }
  }, [
    rangeStart,
    rangeEnd,
    rangeStep,
    runOnce,
    updateNodeCounts,
    testMode,
    canvasNodeCount,
    setRepeat,
  ]);

  // 根据区间估算轮次最大值，限制在 1~10 之间
  // Modified: Allow user to set repeat count more freely, max 100
  const repeatMax = 100;

  // 步长上限
  const stepMax = useMemo(() => {
    const diff = Math.max(1, rangeEnd - rangeStart);
    // 允许步长最大为整个范围（即只测首尾或者单点）
    return Math.max(1, diff);
  }, [rangeStart, rangeEnd]);

  const items = [
    {
      key: 'benchmark',
      label: 'React Vs InkWell',
      children: (
        <div className={styles.section}>
          <div className={styles.fieldRow}>
            <span className={styles.label}>测试内容</span>
            <Select
              value={caseType}
              onChange={(v) => setCaseType(v as TestCaseType)}
              options={TestCaseOptions}
              style={{ minWidth: 140 }}
            />
          </div>
          <div className={styles.fieldRow}>
            <span className={styles.label}>重复次数</span>
            <InputNumber
              className={styles.input}
              min={1}
              max={repeatMax}
              value={repeat}
              onChange={(v) => v && setRepeat(Number(v))}
            />
          </div>
          <div className={styles.presetBar}>
            <Space.Compact>
              {PRESETS.map((p) => (
                <Button
                  key={p.key}
                  className={styles.presetButton}
                  type={preset === p.key ? 'primary' : 'default'}
                  onClick={() => onPresetChange(p.key)}
                >
                  {p.label}
                </Button>
              ))}
            </Space.Compact>
          </div>
          <div className={styles.fieldRow}>
            <span className={styles.label}>范围</span>
            <div className={styles.control}>
              <div className={styles.range}>
                <InputNumber
                  className={styles.input}
                  min={1}
                  value={rangeStart}
                  onChange={(v) => v && setRangeStart(Number(v))}
                />
                <span className={styles.divider}>~</span>
                <InputNumber
                  className={styles.input}
                  min={1}
                  value={rangeEnd}
                  onChange={(v) => v && setRangeEnd(Number(v))}
                />
              </div>
            </div>
          </div>
          <div className={styles.fieldRow}>
            <span className={styles.label}>步长</span>
            <InputNumber
              className={styles.input}
              min={1}
              max={stepMax}
              value={rangeStep}
              onChange={(v) => v && setRangeStep(Number(v))}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'canvas',
      label: 'Inkwell 渲染',
      children: (
        <div className={styles.section}>
          <div className={styles.fieldRow}>
            <span className={styles.label}>测试内容</span>
            <Select
              value={caseType}
              onChange={(v) => setCaseType(v as TestCaseType)}
              // 过滤掉 DOM 相关的测试（虽然 TestCaseOptions 已经是通用描述，但这里可以进一步引导）
              // 暂时使用全部选项，逻辑层会处理只跑 Canvas
              options={TestCaseOptions}
              style={{ minWidth: 140 }}
            />
          </div>
          <div className={styles.fieldRow}>
            <span className={styles.label}>创建节点数量</span>
            <InputNumber
              className={styles.input}
              min={1}
              value={canvasNodeCount}
              onChange={(v) => v && setCanvasNodeCount(Number(v))}
            />
          </div>
          <div
            className={styles.hint}
            style={{ color: 'var(--ink-demo-text-secondary)', fontSize: 12, marginTop: 8 }}
          >
            * 该模式下仅执行单次测试，不进行 DOM 对比
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.panel}>
      <Tabs
        activeKey={testMode}
        onChange={(k) => setTestMode(k as 'benchmark' | 'canvas')}
        items={items}
        centered
        style={{ marginBottom: 16 }}
        className={styles.tabs}
      />

      <div className={styles.section}>
        <div className={styles.actions}>
          <Button
            className={`${styles.actionButton} ${styles.stopButton}`}
            danger
            onClick={stop}
            disabled={!loading}
            icon={<StopOutlined />}
          >
            终止
          </Button>
          {!loading ? (
            <Button
              className={styles.actionButton}
              type="primary"
              onClick={start}
              icon={<PlayCircleOutlined />}
            >
              开始
            </Button>
          ) : paused ? (
            <Button
              className={styles.actionButton}
              type="primary"
              onClick={resume}
              icon={<PlayCircleOutlined />}
            >
              继续
            </Button>
          ) : (
            <Button className={styles.actionButton} onClick={pause} icon={<PauseCircleOutlined />}>
              暂停
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
