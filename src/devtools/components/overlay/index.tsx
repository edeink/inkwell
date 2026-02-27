/**
 * Devtools 选中态 Overlay
 *
 * 负责在画布上方渲染选中框与标签提示。
 * 注意事项：依赖 Runtime 与 Widget 的位置信息。
 * 潜在副作用：注册全局事件监听并创建 Portal。
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';

export { hitTest } from '@/core/helper/hit-test';

import {
  DEVTOOLS_DOM_ATTRIBUTES,
  DEVTOOLS_DOM_EVENT_OPTIONS,
  DEVTOOLS_DOM_EVENTS,
  DEVTOOLS_DOM_TAGS,
} from '../../constants';
import { usePanelStore } from '../../store';

import styles from './index.module.less';

import type { Widget } from '../../../core/base';

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

/**
 * 数值区间裁剪
 *
 * @param n 输入值
 * @param min 最小值
 * @param max 最大值
 * @returns 裁剪后的数值
 * @remarks
 * 注意事项：min 需小于等于 max。
 * 潜在副作用：无。
 */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * 判断 BoxRect 是否一致
 *
 * @param a 矩形 A
 * @param b 矩形 B
 * @returns 是否一致
 * @remarks
 * 注意事项：任一为空则视为不一致。
 * 潜在副作用：无。
 */
function isSameBoxRect(a?: BoxRect, b?: BoxRect): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

/**
 * 判断 ViewportRect 是否一致
 *
 * @param a 视口矩形 A
 * @param b 视口矩形 B
 * @returns 是否一致
 * @remarks
 * 注意事项：任一为空则视为不一致。
 * 潜在副作用：无。
 */
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

/**
 * 判断 Overlay 状态是否一致
 *
 * @param a 状态 A
 * @param b 状态 B
 * @returns 是否一致
 * @remarks
 * 注意事项：用于减少无效重绘。
 * 潜在副作用：无。
 */
function isSameRenderState(a: OverlayRenderState, b: OverlayRenderState): boolean {
  return (
    a.active === b.active &&
    a.label === b.label &&
    a.direction === b.direction &&
    isSameBoxRect(a.boxRect, b.boxRect) &&
    isSameViewportRect(a.targetRect, b.targetRect)
  );
}

/**
 * 计算越界方向提示
 *
 * @param rect 目标矩形
 * @param viewportW 视口宽度
 * @param viewportH 视口高度
 * @returns 越界方向描述
 * @remarks
 * 注意事项：仅用于 UI 提示。
 * 潜在副作用：无。
 */
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

/**
 * Overlay
 *
 * @param props Overlay 参数
 * @returns React 元素或 null
 * @remarks
 * 注意事项：active 为 false 时不渲染。
 * 潜在副作用：注册 DOM 监听并创建 Portal。
 */
const Overlay = function Overlay() {
  const {
    runtime,
    active: overlayActive,
    widget,
  } = usePanelStore(
    useShallow((state) => {
      let active = false;
      let widget: Widget | null = null;

      if (state.activeInspect && state.inspectHoverWidget) {
        active = true;
        widget = state.inspectHoverWidget;
      } else if (state.treeHoverWidget) {
        active = true;
        widget = state.treeHoverWidget;
      } else if (state.pickedWidget) {
        active = true;
        widget = state.pickedWidget;
      }

      return {
        runtime: state.runtime,
        active,
        widget,
      };
    }),
  );

  const rootElRef = useRef<HTMLDivElement | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const lastCommittedRef = useRef<OverlayRenderState>({ active: false });
  const [renderState, setRenderState] = useState<OverlayRenderState>({ active: false });
  const [infoPos, setInfoPos] = useState<{ left: number; top: number } | null>(null);

  const infoRef = useRef<HTMLDivElement | null>(null);

  const computeRenderState = useCallback(
    (target: Widget | null): OverlayRenderState | null => {
      const rt = runtime;
      const container = rt?.container ?? null;
      if (!container || !rootElRef.current) {
        return null;
      }

      if (!overlayActive || !target) {
        return { active: overlayActive };
      }

      const renderer = rt?.getRenderer?.() ?? null;
      const raw = renderer?.getRawInstance?.() as CanvasRenderingContext2D | null;
      const canvas = raw?.canvas ?? container.querySelector(DEVTOOLS_DOM_TAGS.CANVAS) ?? null;
      if (!canvas) {
        return { active: overlayActive };
      }

      const containerRect = container.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const cssTransform = window.getComputedStyle(canvas).transform;
      const cssS =
        cssTransform && cssTransform !== 'none' ? parseCssScale(cssTransform) : { sx: 1, sy: 1 };
      const offsetX = canvasRect.left - containerRect.left;
      const offsetY = canvasRect.top - containerRect.top;

      const wm = target.getWorldMatrix();
      const isIdentity =
        wm[0] === 1 && wm[1] === 0 && wm[2] === 0 && wm[3] === 1 && wm[4] === 0 && wm[5] === 0;
      const hasOffset =
        (target.renderObject.offset?.dx ?? 0) !== 0 || (target.renderObject.offset?.dy ?? 0) !== 0;

      let bbox = target.getBoundingBox(wm);
      if (isIdentity && (hasOffset || target.parent)) {
        const pos = target.getAbsolutePosition();
        bbox = {
          x: pos.dx,
          y: pos.dy,
          width: target.renderObject.size.width,
          height: target.renderObject.size.height,
        };
      }

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

      const direction = resolveOffscreenDirection(
        targetRect,
        window.innerWidth,
        window.innerHeight,
      );

      const wTxt = Math.round(screenWidth);
      const hTxt = Math.round(screenHeight);

      return {
        active: true,
        boxRect: { left: screenLeft, top: screenTop, width: screenWidth, height: screenHeight },
        label: `${target.type} · w:${wTxt} h:${hTxt}`,
        targetRect,
        direction,
      };
    },
    [overlayActive, runtime],
  );

  const scheduleCompute = useCallback((): void => {
    if (rafIdRef.current != null) {
      return;
    }
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const next = computeRenderState(widget);
      if (!next) {
        return;
      }
      if (isSameRenderState(next, lastCommittedRef.current)) {
        return;
      }
      lastCommittedRef.current = next;
      setRenderState(next);
    });
  }, [computeRenderState, widget]);

  useLayoutEffect(() => {
    if (!runtime) {
      return;
    }
    const container = runtime.container;
    if (!container) {
      return;
    }

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
    const shouldCompute = () => overlayActive && !!widget;
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

    window.addEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, onResize);
    window.addEventListener(
      DEVTOOLS_DOM_EVENTS.SCROLL,
      onScroll,
      DEVTOOLS_DOM_EVENT_OPTIONS.PASSIVE_TRUE,
    );

    let mo: MutationObserver | null = null;
    const renderer = runtime.getRenderer();
    const raw = renderer?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas =
      raw?.canvas ?? runtime.container?.querySelector(DEVTOOLS_DOM_TAGS.CANVAS) ?? null;
    if (canvas && typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(() => {
        if (!shouldCompute()) {
          return;
        }
        scheduleCompute();
      });
      mo.observe(canvas, {
        attributes: true,
        attributeFilter: [DEVTOOLS_DOM_ATTRIBUTES.STYLE, DEVTOOLS_DOM_ATTRIBUTES.CLASS],
      });
    }

    return () => {
      window.removeEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, onResize);
      window.removeEventListener(DEVTOOLS_DOM_EVENTS.SCROLL, onScroll);
      mo?.disconnect?.();
      mo = null;
    };
  }, [overlayActive, runtime, scheduleCompute, widget]);

  useEffect(() => {
    scheduleCompute();
  }, [scheduleCompute]);

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

    const left = clamp(targetRect.left, margin, Math.max(margin, vw - margin - infoBox.width));

    setInfoPos((prev) => {
      if (prev && prev.left === left && prev.top === top) {
        return prev;
      }
      return { left, top };
    });
  }, [active, infoText, targetRect]);

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
};

export default Overlay;

/**
 * 解析 CSS transform 的缩放值
 *
 * @param transform transform 字符串
 * @returns 缩放系数
 * @remarks
 * 注意事项：仅解析 scale/scale3d 形式。
 * 潜在副作用：无。
 */
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
