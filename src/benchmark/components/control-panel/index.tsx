import { Button, InputNumber, Select, Space } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import styles from './index.module.less';

type Props = {
  nodeCounts: number[];
  setNodeCounts: (v: number[]) => void;
  repeat: number;
  setRepeat: (v: number) => void;
  start: () => void;
  stop: () => void;
  loading: boolean;
  layoutType: 'absolute' | 'flex' | 'text';
  setLayoutType: (v: 'absolute' | 'flex' | 'text') => void;
};

type PresetKey = 'common' | 'small' | 'large';

type Preset = {
  key: PresetKey;
  label: string;
  start: number;
  end: number;
  step?: number;
};

const PRESETS: Preset[] = [
  { key: 'common', label: '常用', start: 100, end: 10000, step: 100 },
  { key: 'small', label: '小规模', start: 50, end: 500, step: 50 },
  { key: 'large', label: '大规模', start: 5000, end: 20000, step: 100 },
];

export default function ControlPanel({
  nodeCounts,
  setNodeCounts,
  repeat,
  setRepeat,
  start,
  stop,
  loading,
  layoutType,
  setLayoutType,
}: Props) {
  const [rangeStart, setRangeStart] = useState<number>(100);
  const [rangeEnd, setRangeEnd] = useState<number>(10000);
  const [rangeStep, setRangeStep] = useState<number>(100);
  type PresetKey = 'common' | 'small' | 'large';
  const [preset, setPreset] = useState<PresetKey | null>('common');

  const onPresetChange = useCallback((key: PresetKey) => {
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

  useEffect(() => {
    updateNodeCounts(rangeStart, rangeEnd, rangeStep);
  }, [rangeStart, rangeEnd, rangeStep, updateNodeCounts]);

  const repeatMax = useMemo(() => {
    const len = Math.max(1, Math.floor((rangeEnd - rangeStart) / Math.max(1, rangeStep)) + 1);
    return Math.min(10, Math.max(1, len));
  }, [rangeStart, rangeEnd, rangeStep]);

  const stepMax = useMemo(() => {
    const diff = Math.max(1, rangeEnd - rangeStart);
    return Math.min(10000, Math.max(1, Math.floor(diff / 5)));
  }, [rangeStart, rangeEnd]);

  return (
    <div className={styles.panel}>
      <div className={styles.sectionTitle}>配置</div>
      <div className={styles.section}>
        <div className={styles.fieldRow}>
          <span className={styles.label}>布局</span>
          <Select
            value={layoutType}
            onChange={(v) => setLayoutType(v as any)}
            options={[
              { label: 'Absolute', value: 'absolute' },
              { label: 'Flex', value: 'flex' },
              { label: 'Text', value: 'text' },
            ]}
            style={{ minWidth: 140 }}
          />
        </div>
        <div className={styles.fieldRow}>
          <span className={styles.label}>轮次</span>
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
          <Button className={styles.actionButton} danger onClick={stop} disabled={!loading}>
            停止
          </Button>
          <Button className={styles.actionButton} type="primary" onClick={start} disabled={loading}>
            运行测试
          </Button>
        </div>
      </div>
    </div>
  );
}
