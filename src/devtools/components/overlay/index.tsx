import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import styles from './index.module.less';

import type { Widget } from '../../../core/base';
import type Runtime from '../../../runtime';
export { hitTest } from '@/core/helper/hit-test';

/**
 * DevTools 高亮覆盖层（Overlay）
 *
 * 核心职责：
 * - 将 Widget 的世界坐标包围盒转换为 DOM 像素坐标，并绘制高亮框与信息条。
 * - 用 requestAnimationFrame 合并多次 highlight/setActive 调用，避免频繁 setState。
 * - 通过 Portal 挂载到 runtime.container 内，保证覆盖在 canvas 之上且不拦截交互。
 */
type BoxRect = { left: number; top: number; width: number; height: number };
type ViewportRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

type OverlayRenderState = {
  active: boolean;
  boxRect?: BoxRect;
  label?: string;
  targetRect?: ViewportRect;
  direction?: string | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isSameBoxRect(a?: BoxRect, b?: BoxRect): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

function isSameViewportRect(a?: ViewportRect, b?: ViewportRect): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height &&
    a.right === b.right &&
    a.bottom === b.bottom
  );
}

function isSameRenderState(a: OverlayRenderState, b: OverlayRenderState): boolean {
  return (
    a.active === b.active &&
    a.label === b.label &&
    a.direction === b.direction &&
    isSameBoxRect(a.boxRect, b.boxRect) &&
    isSameViewportRect(a.targetRect, b.targetRect)
  );
}

function resolveOffscreenDirection(
  rect: ViewportRect,
  viewportW: number,
  viewportH: number,
): string | null {
  const outLeft = rect.right < 0;
  const outRight = rect.left > viewportW;
  const outTop = rect.bottom < 0;
  const outBottom = rect.top > viewportH;
  if (!outLeft && !outRight && !outTop && !outBottom) {
    return null;
  }
  if (outTop && outLeft) {
    return '↖';
  }
  if (outTop && outRight) {
    return '↗';
  }
  if (outBottom && outLeft) {
    return '↙';
  }
  if (outBottom && outRight) {
    return '↘';
  }
  if (outTop) {
    return '↑';
  }
  if (outBottom) {
    return '↓';
  }
  if (outLeft) {
    return '←';
  }
  return '→';
}

export type OverlayHandle = {
  setActive: (v: boolean) => void;
  highlight: (widget: Widget | null) => void;
};

export default forwardRef<OverlayHandle, { runtime: Runtime | null }>(function Overlay(
  { runtime },
  ref,
) {
  const rootElRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<Runtime | null>(runtime);
  const activeRef = useRef<boolean>(false);
  const currentWidgetRef = useRef<Widget | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const lastCommittedRef = useRef<OverlayRenderState>({ active: false });
  const [renderState, setRenderState] = useState<OverlayRenderState>({ active: false });

  const infoRef = useRef<HTMLDivElement | null>(null);
  const [infoPos, setInfoPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime]);

  const computeRenderState = useCallback((widget: Widget | null): OverlayRenderState | null => {
    const rt = runtimeRef.current;
    const container = rt?.container ?? null;
    if (!container || !rootElRef.current) {
      return null;
    }

    // 未开启 Inspect 或未命中节点时，仅同步 active 状态并清空高亮数据。
    if (!activeRef.current || !widget) {
      return { active: activeRef.current };
    }

    const renderer = rt?.getRenderer?.() ?? null;
    const raw = renderer?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? container.querySelector('canvas') ?? null;
    if (!canvas) {
      return { active: activeRef.current };
    }

    // 1) 先将 Widget 的世界坐标（canvas 内）换算为容器内的像素坐标。
    // 2) 再叠加 canvas 在容器中的偏移与 CSS transform(scale)。
    const containerRect = container.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const cssTransform = window.getComputedStyle(canvas).transform;
    const cssS =
      cssTransform && cssTransform !== 'none' ? parseCssScale(cssTransform) : { sx: 1, sy: 1 };
    const offsetX = canvasRect.left - containerRect.left;
    const offsetY = canvasRect.top - containerRect.top;

    // 正常情况使用世界矩阵包围盒；当矩阵仍为 identity（例如未经历 paint 计算矩阵）时回退到绝对位置。
    const wm = widget.getWorldMatrix();
    const isIdentity =
      wm[0] === 1 && wm[1] === 0 && wm[2] === 0 && wm[3] === 1 && wm[4] === 0 && wm[5] === 0;
    const hasOffset =
      (widget.renderObject.offset?.dx ?? 0) !== 0 || (widget.renderObject.offset?.dy ?? 0) !== 0;

    let bbox = widget.getBoundingBox(wm);
    if (isIdentity && (hasOffset || widget.parent)) {
      const pos = widget.getAbsolutePosition();
      bbox = {
        x: pos.dx,
        y: pos.dy,
        width: widget.renderObject.size.width,
        height: widget.renderObject.size.height,
      };
    }

    // 最终的屏幕像素坐标（相对容器）。
    const screenLeft = offsetX + bbox.x * cssS.sx;
    const screenTop = offsetY + bbox.y * cssS.sy;
    const screenWidth = bbox.width * cssS.sx;
    const screenHeight = bbox.height * cssS.sy;

    const viewportLeft = containerRect.left + screenLeft;
    const viewportTop = containerRect.top + screenTop;
    const targetRect: ViewportRect = {
      left: viewportLeft,
      top: viewportTop,
      width: screenWidth,
      height: screenHeight,
      right: viewportLeft + screenWidth,
      bottom: viewportTop + screenHeight,
    };

    const direction = resolveOffscreenDirection(targetRect, window.innerWidth, window.innerHeight);

    const wTxt = Math.round(screenWidth);
    const hTxt = Math.round(screenHeight);

    return {
      active: true,
      boxRect: { left: screenLeft, top: screenTop, width: screenWidth, height: screenHeight },
      label: `${widget.type} · w:${wTxt} h:${hTxt}`,
      targetRect,
      direction,
    };
  }, []);

  const scheduleCompute = useCallback((): void => {
    if (rafIdRef.current != null) {
      return;
    }
    // 合并到同一帧提交，避免 mousemove/hover 高频触发 setState。
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const next = computeRenderState(currentWidgetRef.current);
      if (!next) {
        return;
      }
      if (isSameRenderState(next, lastCommittedRef.current)) {
        return;
      }
      lastCommittedRef.current = next;
      setRenderState(next);
    });
  }, [computeRenderState]);

  useImperativeHandle(
    ref,
    () => ({
      setActive(v: boolean) {
        activeRef.current = v;
        if (!v) {
          currentWidgetRef.current = null;
        }
        scheduleCompute();
      },
      highlight(widget: Widget | null) {
        currentWidgetRef.current = widget;
        scheduleCompute();
      },
    }),
    [scheduleCompute],
  );

  useLayoutEffect(() => {
    if (!runtime) {
      return;
    }
    const container = runtime.container;
    if (!container) {
      return;
    }

    // Overlay 需要绝对定位覆盖容器；当容器为 static 时，提升为 relative。
    const computed = window.getComputedStyle(container);
    if (computed.position === 'static') {
      container.style.position = 'relative';
    }

    const el = document.createElement('div');
    el.className = styles.overlayRoot;
    container.appendChild(el);
    rootElRef.current = el;

    return () => {
      rootElRef.current = null;
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      lastCommittedRef.current = { active: false };
      setRenderState({ active: false });
      // 避免卸载时与 React commit/DOM 更新顺序交错，延后移除宿主节点更稳妥。
      runtime.nextTick(() => el.remove());
    };
  }, [runtime]);

  useEffect(() => {
    if (!runtime) {
      return;
    }

    // 外部环境变化时需要重算位置：窗口 resize、页面滚动、canvas style/class 变化（例如缩放/平移）。
    const shouldCompute = () => activeRef.current && !!currentWidgetRef.current;
    const onResize = () => {
      if (!shouldCompute()) {
        return;
      }
      scheduleCompute();
    };
    const onScroll = () => {
      if (!shouldCompute()) {
        return;
      }
      scheduleCompute();
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });

    let mo: MutationObserver | null = null;
    const renderer = runtime.getRenderer();
    const raw = renderer?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? runtime.container?.querySelector('canvas') ?? null;
    if (canvas && typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(() => {
        if (!shouldCompute()) {
          return;
        }
        scheduleCompute();
      });
      mo.observe(canvas, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      mo?.disconnect?.();
      mo = null;
    };
  }, [runtime, scheduleCompute]);

  const { active, boxRect, label, targetRect, direction } = renderState;
  const infoText = useMemo(() => label ?? '', [label]);
  const dirText = useMemo(() => direction ?? '', [direction]);

  useLayoutEffect(() => {
    if (!active || !targetRect || !infoRef.current) {
      setInfoPos(null);
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    const gap = 8;

    const infoBox = infoRef.current.getBoundingClientRect();

    const preferAbove = targetRect.top - gap - infoBox.height >= margin;
    let top = preferAbove ? targetRect.top - gap - infoBox.height : targetRect.bottom + gap;
    top = clamp(top, margin, Math.max(margin, vh - margin - infoBox.height));

    let left = targetRect.left;
    left = clamp(left, margin, Math.max(margin, vw - margin - infoBox.width));

    setInfoPos({ left, top });
  }, [active, targetRect, infoText]);

  if (!rootElRef.current) {
    return null;
  }

  if (!active || !boxRect) {
    return null;
  }

  let infoStyle: { left: string; top: string } | undefined;
  if (infoPos) {
    infoStyle = { left: `${infoPos.left}px`, top: `${infoPos.top}px` };
  }

  return createPortal(
    <>
      <div
        className={[styles.overlayBox, styles.debug].join(' ')}
        style={{
          left: `${boxRect.left}px`,
          top: `${boxRect.top}px`,
          width: `${boxRect.width}px`,
          height: `${boxRect.height}px`,
        }}
      >
        <div className={styles.guideH} />
        <div className={styles.guideV} />
      </div>

      <div ref={infoRef} className={styles.overlayInfo} style={infoStyle}>
        {dirText ? <span className={styles.overlayArrow}>{dirText}</span> : null}
        <span className={styles.overlayLabel}>{infoText}</span>
      </div>
    </>,
    rootElRef.current,
  );
});

function parseCssScale(transform: string): { sx: number; sy: number } {
  const t = transform.trim();
  if (!t || t === 'none') {
    return { sx: 1, sy: 1 };
  }
  const m = t.match(/matrix\(([^)]+)\)/);
  if (m && m[1]) {
    const parts = m[1].split(',').map((v) => Number(v.trim()));
    const a = parts[0] ?? 1;
    const b = parts[1] ?? 0;
    const c = parts[2] ?? 0;
    const d = parts[3] ?? 1;
    const sx = Math.sqrt(a * a + b * b) || 1;
    const sy = Math.sqrt(c * c + d * d) || 1;
    return { sx, sy };
  }
  return { sx: 1, sy: 1 };
}
