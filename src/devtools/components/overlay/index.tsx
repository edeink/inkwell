import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import styles from './index.module.less';

import type { Widget } from '../../../core/base';
import type Runtime from '../../../runtime';

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
  debug?: boolean;
};

/**
 * Overlay 高亮框
 * - 使用 React 的 JSX 声明式渲染，避免散落的 DOM 操作
 * - 高亮框使用绝对定位（相对画布容器）
 * - info 使用 fixed，确保目标越界时仍在窗口内可见
 */
export default class Overlay {
  private editor: Runtime;
  private rootEl: HTMLDivElement | null = null;
  private reactRoot: Root | null = null;
  private active = false;
  private mo: MutationObserver | null = null;
  private getCurrent: (() => Widget | null) | null = null;
  private onWindowResize = () => this.highlight(this.getCurrent?.() ?? null);
  private onWindowScroll = () => this.highlight(this.getCurrent?.() ?? null);
  private rafId: number | null = null;
  private renderState: OverlayRenderState = { active: false };

  constructor(editor: Runtime) {
    this.editor = editor;
  }

  mount(): void {
    const container = this.editor.container;
    if (!container) {
      return;
    }
    try {
      const computed = window.getComputedStyle(container);
      if (computed.position === 'static') {
        container.style.position = 'relative';
      }
    } catch (e) {
      console.debug('DevTools Overlay：无法设置容器定位方式', e);
    }

    const rootEl = document.createElement('div');
    rootEl.className = styles.overlayRoot;
    container.appendChild(rootEl);
    this.rootEl = rootEl;
    this.reactRoot = createRoot(rootEl);
    this.renderState = { active: false };
    this.render();
  }

  unmount(): void {
    if (this.rafId != null) {
      try {
        cancelAnimationFrame(this.rafId);
      } catch {
        void 0;
      }
      this.rafId = null;
    }
    if (this.reactRoot) {
      try {
        this.reactRoot.unmount();
      } catch {
        void 0;
      }
    }
    this.reactRoot = null;
    if (this.rootEl && this.rootEl.parentElement) {
      this.rootEl.parentElement.removeChild(this.rootEl);
    }
    this.rootEl = null;
    this.active = false;
    this.stopAutoUpdate();
  }

  setActive(v: boolean): void {
    this.active = v;
    this.renderState = { ...this.renderState, active: v };
    this.scheduleRender();
  }

  /**
   * 计算目标在容器内的屏幕坐标，并更新渲染状态
   * 说明：
   * - boxRect：相对容器定位（绝对定位）
   * - targetRect：相对窗口定位（用于 info 贴边与越界提示）
   */
  highlight(widget: Widget | null): void {
    try {
      const container = this.editor.container;
      const renderer = this.editor.getRenderer();
      const raw = renderer?.getRawInstance?.() as CanvasRenderingContext2D | null;
      const canvas = raw?.canvas ?? container?.querySelector('canvas') ?? null;
      if (!container || !canvas || !this.reactRoot) {
        return;
      }

      if (!this.active || !widget) {
        this.renderState = { ...this.renderState, active: this.active, boxRect: undefined };
        this.scheduleRender();
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const cssTransform = window.getComputedStyle(canvas).transform;
      const offsetX = canvasRect.left - containerRect.left;
      const offsetY = canvasRect.top - containerRect.top;

      const wm = widget.getWorldMatrix?.() as
        | [number, number, number, number, number, number]
        | undefined;
      const bounds = isConnectorLike(widget) ? widget.getBounds() : null;
      const localX = bounds ? bounds.x : 0;
      const localY = bounds ? bounds.y : 0;
      const width = bounds ? bounds.width : widget.renderObject.size.width;
      const height = bounds ? bounds.height : widget.renderObject.size.height;
      const x0 = wm
        ? wm[4] + (wm[0] * localX + wm[2] * localY)
        : widget.getAbsolutePosition().dx + localX;
      const y0 = wm
        ? wm[5] + (wm[1] * localX + wm[3] * localY)
        : widget.getAbsolutePosition().dy + localY;
      const sx0 = wm ? Math.sqrt(wm[0] * wm[0] + wm[1] * wm[1]) : 1;
      const sy0 = wm ? Math.sqrt(wm[2] * wm[2] + wm[3] * wm[3]) : 1;
      const cssS =
        cssTransform && cssTransform !== 'none' ? parseCssScale(cssTransform) : { sx: 1, sy: 1 };
      const scaleX = sx0 * cssS.sx;
      const scaleY = sy0 * cssS.sy;

      const screenLeft = offsetX + x0 * cssS.sx;
      const screenTop = offsetY + y0 * cssS.sy;
      const screenWidth = width * scaleX;
      const screenHeight = height * scaleY;

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
      const isDev =
        typeof window !== 'undefined' &&
        /localhost|127\.0\.0\.1/.test(window.location?.hostname ?? '');

      const wTxt = Math.round(screenWidth);
      const hTxt = Math.round(screenHeight);

      this.renderState = {
        active: true,
        boxRect: { left: screenLeft, top: screenTop, width: screenWidth, height: screenHeight },
        label: `${widget.type} · w:${wTxt} h:${hTxt}`,
        targetRect,
        direction,
        debug: isDev,
      };
      this.scheduleRender();
    } catch (err) {
      console.warn('DevTools Overlay 高亮失败：', err);
    }
  }

  /**
   * 开启自动刷新：在窗口 resize/scroll 或画布属性变化时刷新高亮
   * @param provider 返回当前命中的 Widget（由 DevTools 提供）
   */
  startAutoUpdate(provider: () => Widget | null): void {
    this.getCurrent = provider;
    try {
      window.addEventListener('resize', this.onWindowResize);
      window.addEventListener('scroll', this.onWindowScroll, { passive: true });
    } catch {
      void 0;
    }
    try {
      const renderer = this.editor.getRenderer();
      const raw = renderer?.getRawInstance?.() as CanvasRenderingContext2D | null;
      const canvas = raw?.canvas ?? this.editor.container?.querySelector('canvas') ?? null;
      if (canvas) {
        this.mo = new MutationObserver(() => this.highlight(this.getCurrent?.() ?? null));
        this.mo.observe(canvas, { attributes: true, attributeFilter: ['style', 'class'] });
      }
    } catch {
      void 0;
    }
  }

  /**
   * 关闭自动刷新并清理所有监听
   */
  stopAutoUpdate(): void {
    try {
      window.removeEventListener('resize', this.onWindowResize);
      window.removeEventListener('scroll', this.onWindowScroll);
    } catch {
      void 0;
    }
    try {
      this.mo?.disconnect?.();
    } catch {
      void 0;
    }
    this.mo = null;
    this.getCurrent = null;
  }

  private scheduleRender() {
    if (!this.reactRoot) {
      return;
    }
    if (this.rafId != null) {
      return;
    }
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.render();
    });
  }

  private render() {
    if (!this.reactRoot) {
      return;
    }
    this.reactRoot.render(<OverlayView {...this.renderState} />);
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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

function OverlayView({ active, boxRect, label, targetRect, direction, debug }: OverlayRenderState) {
  const infoRef = useRef<HTMLDivElement | null>(null);
  const [infoPos, setInfoPos] = useState<{ left: number; top: number } | null>(null);

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
  }, [active, targetRect?.left, targetRect?.top, targetRect?.width, targetRect?.height, infoText]);

  if (!active || !boxRect) {
    return null;
  }

  return (
    <>
      <div
        className={[styles.overlayBox, debug ? styles.debug : ''].filter(Boolean).join(' ')}
        style={{
          left: `${boxRect.left}px`,
          top: `${boxRect.top}px`,
          width: `${boxRect.width}px`,
          height: `${boxRect.height}px`,
        }}
      >
        {debug ? (
          <>
            <div className={styles.guideH} />
            <div className={styles.guideV} />
          </>
        ) : null}
      </div>

      <div
        ref={infoRef}
        className={styles.overlayInfo}
        style={
          infoPos
            ? {
                left: `${infoPos.left}px`,
                top: `${infoPos.top}px`,
              }
            : undefined
        }
      >
        {dirText ? <span className={styles.overlayArrow}>{dirText}</span> : null}
        <span className={styles.overlayLabel}>{infoText}</span>
      </div>
    </>
  );
}

/**
 * 命中测试
 * 功能：根据坐标在 Widget 树中查找最内层命中节点
 * 参数：root - 根组件；x - 横坐标；y - 纵坐标
 * 返回：命中的 Widget 或 null
 */
export function hitTest(root: Widget | null, x: number, y: number): Widget | null {
  if (!root) {
    return null;
  }
  let found: Widget | null = null;
  function dfs(node: Widget): void {
    const wm = node.getWorldMatrix?.() as
      | [number, number, number, number, number, number]
      | undefined;
    const bounds = isConnectorLike(node) ? node.getBounds() : null;
    const localX = bounds ? bounds.x : 0;
    const localY = bounds ? bounds.y : 0;
    const widthLocal = bounds ? bounds.width : node.renderObject.size.width;
    const heightLocal = bounds ? bounds.height : node.renderObject.size.height;
    const x0 = wm
      ? wm[4] + (wm[0] * localX + wm[2] * localY)
      : node.getAbsolutePosition().dx + localX;
    const y0 = wm
      ? wm[5] + (wm[1] * localX + wm[3] * localY)
      : node.getAbsolutePosition().dy + localY;
    const sx0 = wm ? Math.sqrt(wm[0] * wm[0] + wm[1] * wm[1]) : 1;
    const sy0 = wm ? Math.sqrt(wm[2] * wm[2] + wm[3] * wm[3]) : 1;
    const left = x0;
    const top = y0;
    const width = widthLocal * sx0;
    const height = heightLocal * sy0;
    if (x >= left && x <= left + width && y >= top && y <= top + height) {
      found = node;
      for (const child of node.children) {
        dfs(child);
      }
    }
  }
  dfs(root);
  return found;
}

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

type ConnectorBounds = { x: number; y: number; width: number; height: number };
type ConnectorLike = Widget & { type: string; getBounds: () => ConnectorBounds | null };
function isConnectorLike(w: Widget): w is ConnectorLike {
  const maybe = w as unknown as { getBounds?: unknown };
  return w.type === 'Connector' && typeof maybe.getBounds === 'function';
}
