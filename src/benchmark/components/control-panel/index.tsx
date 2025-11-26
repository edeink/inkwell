import { Button, InputNumber } from 'antd';
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
};

export default function ControlPanel({
  nodeCounts,
  setNodeCounts,
  repeat,
  setRepeat,
  start,
  stop,
  loading,
}: Props) {
  const [rangeStart, setRangeStart] = useState<number>(100);
  const [rangeEnd, setRangeEnd] = useState<number>(10000);
  const [rangeStep, setRangeStep] = useState<number>(100);
  const [preset, setPreset] = useState<string | null>('常用');

  const onPresetChange = useCallback((key: string | number) => {
    const ks = String(key);
    setPreset(ks);
    if (ks === '常用') {
      setRangeStart(100);
      setRangeEnd(10000);
    } else if (ks === '小规模') {
      setRangeStart(50);
      setRangeStep(50);
      setRangeEnd(500);
    } else if (ks === '大规模') {
      setRangeStart(5000);
      setRangeEnd(20000);
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
        if (list.length > 50) {
          break;
        }
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
        <div className={styles.presetBar}>
          <Button
            className={styles.presetButton}
            type={preset === '常用' ? 'primary' : 'default'}
            onClick={() => onPresetChange('常用')}
          >
            常用
          </Button>
          <Button
            className={styles.presetButton}
            type={preset === '小规模' ? 'primary' : 'default'}
            onClick={() => onPresetChange('小规模')}
          >
            小规模
          </Button>
          <Button
            className={styles.presetButton}
            type={preset === '大规模' ? 'primary' : 'default'}
            onClick={() => onPresetChange('大规模')}
          >
            大规模
          </Button>
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
