import { throttle } from 'lodash-es';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SCALE_CONFIG } from '../../constants';
import { useMindmapController } from '../../hooks/context';
import { useMindmapView } from '../../hooks/use-mindmap-view';
import { CustomComponentType } from '../../type';

import { quantize } from './helper';
import styles from './index.module.less';

import { findWidget } from '@/core/helper/widget-selector';
import { InputNumber, Tooltip } from '@/ui';
import { MinusOutlined, PlusOutlined, ReloadOutlined } from '@/ui/icons';

interface ZoomBarProps {
  min?: number;
  max?: number;
  step?: number;
}

export default function ZoomBar({
  min = SCALE_CONFIG.MIN_SCALE,
  max = SCALE_CONFIG.MAX_SCALE,
  step = 0.01,
}: ZoomBarProps) {
  const controller = useMindmapController();
  const viewState = useMindmapView();
  const value = viewState.scale;

  const getViewportCenter = useCallback((): { cx: number; cy: number; vw: number; vh: number } => {
    const rect = controller.runtime.container?.getBoundingClientRect?.();
    const vw = rect?.width ?? window.innerWidth;
    const vh = rect?.height ?? window.innerHeight;
    return { cx: vw / 2, cy: vh / 2, vw, vh };
  }, [controller.runtime.container]);

  const onChange = useCallback(
    (v: number) => {
      const { cx, cy } = getViewportCenter();
      controller.zoomAt(v, cx, cy);
    },
    [controller, getViewportCenter],
  );

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
    const onMove = throttle((e: PointerEvent) => {
      if (!dragging) {
        return;
      }
      updateFromClientX(e.clientX);
    }, 16);
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      onMove.cancel();
    };
  }, [dragging, updateFromClientX]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
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
    const root = controller.runtime.getRootWidget();
    const layout = findWidget(root, CustomComponentType.MindMapLayout) as {
      renderObject?: { size?: { width: number; height: number } };
    } | null;
    const size = layout?.renderObject?.size ?? null;

    if (size) {
      const { vw, vh } = getViewportCenter();
      const scrollX = -((vw - size.width) / 2);
      const scrollY = -((vh - size.height) / 2);
      controller.viewport.scrollTo(scrollX, scrollY);
    }

    controller.viewport.setTransform(next, 0, 0);
    controller.syncView({
      scale: controller.viewport.scale,
      tx: controller.viewport.tx,
      ty: controller.viewport.ty,
    });
  }, [controller, getViewportCenter, max, min, step]);

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
    <div
      className={styles.zoomBar}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
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
          formatter={(v?: string | number) => `${v ?? ''}%`}
          parser={(v: string) => Number(String(v ?? '').replace(/%/g, ''))}
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
