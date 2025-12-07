import { MinusOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { InputNumber, Tooltip } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SCALE_CONFIG } from '../../config/constants';

import { quantize } from './helper';
import styles from './index.module.less';

interface ZoomBarProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

export default function ZoomBar({
  value,
  min = SCALE_CONFIG.MIN_SCALE,
  max = SCALE_CONFIG.MAX_SCALE,
  step = 0.01,
  onChange,
}: ZoomBarProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const percent = Math.round(value * 100);

  const ratio = useMemo(() => {
    const r = (value - min) / (max - min);
    return Math.max(0, Math.min(1, r));
  }, [value, min, max]);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const x = Math.max(0, Math.min(w, clientX - rect.left));
      const r = x / w;
      const target = min + r * (max - min);
      const q = quantize(target, min, max, step);
      onChange(q);
    },
    [min, max, step, onChange],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging) {
        return;
      }
      updateFromClientX(e.clientX);
    };
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, updateFromClientX]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      updateFromClientX(e.clientX);
    },
    [updateFromClientX],
  );

  // 减少10%（按百分比点数）
  const onMinus = useCallback(() => {
    const next = quantize(value - 0.1, min, max, step);
    onChange(next);
  }, [value, min, max, step, onChange]);

  // 增加10%（按照 Chrome 的缩放步进）
  const onPlus = useCallback(() => {
    const next = quantize(value + 0.1, min, max, step);
    onChange(next);
  }, [value, min, max, step, onChange]);

  // 重置为 100% 并让父层居中（父层 onChange 已传入居中逻辑）
  const onReset = useCallback(() => {
    const next = quantize(1, min, max, step);
    onChange(next);
  }, [min, max, step, onChange]);

  // 百分比输入（整数，10%~800%），实时同步缩放值
  const onPercentChange = useCallback(
    (v: number | null) => {
      const minPct = Math.round(min * 100);
      const maxPct = Math.round(max * 100);
      const n = Math.max(minPct, Math.min(maxPct, Math.round(Number(v ?? percent))));
      const s = quantize(n / 100, min, max, step);
      onChange(s);
    },
    [percent, min, max, step, onChange],
  );

  return (
    <div className={styles.zoomBar}>
      <div className={styles.track} ref={trackRef} onPointerDown={handlePointerDown}>
        <div className={styles.fill} style={{ width: `${ratio * 100}%` }} />
        <div className={styles.thumb} style={{ left: `${ratio * 100}%` }} />
      </div>
      <div className={styles.controls}>
        <Tooltip title="减少 10%">
          <button className={styles.iconBtn} onClick={onMinus} aria-label="decrease">
            <MinusOutlined />
          </button>
        </Tooltip>
        <InputNumber
          className={styles.percentInput}
          min={Math.round(min * 100)}
          max={Math.round(max * 100)}
          step={10}
          value={percent}
          precision={0}
          formatter={(v) => `${v}%`}
          parser={(v) => Number(String(v ?? '').replace(/%/g, ''))}
          onChange={onPercentChange}
        />
        <Tooltip title="增加 10%">
          <button className={styles.iconBtn} onClick={onPlus} aria-label="increase">
            <PlusOutlined />
          </button>
        </Tooltip>
        <Tooltip title="重置为 100% 并居中">
          <button className={styles.iconBtn} onClick={onReset} aria-label="reset">
            <ReloadOutlined />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
