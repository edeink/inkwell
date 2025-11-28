import { PauseCircleOutlined, PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import { Button, InputNumber, Select, Space } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { TestCaseOptions } from '../../index.types';

import styles from './index.module.less';

import type { TestCaseType } from '../../index.types';

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
  start: number;
  end: number;
  step?: number;
};

// 预设集合：覆盖常用、小规模与大规模三档
const PRESETS: Preset[] = [
  { key: PresetType.Common, label: '常用', start: 100, end: 10000, step: 100 },
  { key: PresetType.Small, label: '小规模', start: 50, end: 500, step: 50 },
  { key: PresetType.Large, label: '大规模', start: 5000, end: 20000, step: 100 },
];

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
}: Props) {
  const [rangeStart, setRangeStart] = useState<number>(100);
  const [rangeEnd, setRangeEnd] = useState<number>(10000);
  const [rangeStep, setRangeStep] = useState<number>(100);
  const [preset, setPreset] = useState<PresetType>(PresetType.Common);

  // 切换预设并同步区间与步长
  const onPresetChange = useCallback((key: PresetType) => {
    const cfg = PRESETS.find((p) => p.key === key);
    if (!cfg) {
      return;
    }
    setPreset(cfg.key);
    setRangeStart(cfg.start);
    setRangeEnd(cfg.end);
    if (cfg.step) {
      setRangeStep(cfg.step);
    }
  }, []);

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
      if (si >= ei) {
        return;
      }
      const list: number[] = [];
      for (let v = si; v <= ei; v += st) {
        list.push(v);
      }
      setNodeCounts(list);
    },
    [setNodeCounts],
  );

  // 当区间或步长变化时，自动刷新节点列表
  useEffect(() => {
    updateNodeCounts(rangeStart, rangeEnd, rangeStep);
  }, [rangeStart, rangeEnd, rangeStep, updateNodeCounts]);

  // 根据区间估算轮次最大值，限制在 1~10 之间，避免过长测试
  const repeatMax = useMemo(() => {
    const len = Math.max(1, Math.floor((rangeEnd - rangeStart) / Math.max(1, rangeStep)) + 1);
    return Math.min(10, Math.max(1, len));
  }, [rangeStart, rangeEnd, rangeStep]);

  // 步长上限：区间跨度的约 1/5，避免刻度过于稀疏
  const stepMax = useMemo(() => {
    const diff = Math.max(1, rangeEnd - rangeStart);
    return Math.min(10000, Math.max(1, Math.floor(diff / 5)));
  }, [rangeStart, rangeEnd]);

  return (
    <div className={styles.panel}>
      <div className={styles.sectionTitle}>配置</div>
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
          <span className={styles.label}>节点区间</span>
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
      <div className={styles.section}>
        <div className={styles.actions}>
          <Button
            className={styles.actionButton}
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
