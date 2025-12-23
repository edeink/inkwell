import styles from './index.module.less';

import type { Widget } from '../../../core/base';
import type Runtime from '../../../runtime';

/**
 * Overlay 高亮框
 * 功能：渲染并控制画布上的高亮框，支持跟随 Inspect 模式显示/隐藏
 * 参数：editor - 编辑器实例，用于获取容器与渲染器
 * 返回：类实例，提供 mount/unmount/setActive/highlight 方法
 */
export default class Overlay {
  private editor: Runtime;
  private box: HTMLDivElement | null = null;
  private info: HTMLDivElement | null = null;
  private active = false;
  private mo: MutationObserver | null = null;
  private getCurrent: (() => Widget | null) | null = null;
  private onWindowResize = () => this.highlight(this.getCurrent?.() ?? null);
  private onWindowScroll = () => this.highlight(this.getCurrent?.() ?? null);

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
      console.debug('DevTools overlay: unable to set container position', e);
    }
    const box = document.createElement('div');
    box.className = styles.overlayBox;
    const info = document.createElement('div');
    info.className = styles.overlayInfo;
    box.appendChild(info);
    const isDev =
      typeof window !== 'undefined' &&
      /localhost|127\.0\.0\.1/.test(window.location?.hostname ?? '');
    if (isDev) {
      const guideH = document.createElement('div');
      guideH.className = styles.guideH;
      const guideV = document.createElement('div');
      guideV.className = styles.guideV;
      box.appendChild(guideH);
      box.appendChild(guideV);
      box.classList.add(styles.debug);
    }
    container.appendChild(box);
    this.box = box;
    this.info = info;
    this.setActive(false);
  }

  unmount(): void {
    if (this.box && this.box.parentElement) {
      this.box.parentElement.removeChild(this.box);
    }
    this.box = null;
    this.info = null;
    this.active = false;
    this.stopAutoUpdate();
  }

  setActive(v: boolean): void {
    this.active = v;
    if (this.box && !v) {
      this.box.style.display = 'none';
    }
  }

  highlight(widget: Widget | null): void {
    try {
      const container = this.editor.container;
      const renderer = this.editor.getRenderer();
      const raw = renderer?.getRawInstance?.() as CanvasRenderingContext2D | null;
      const canvas = raw?.canvas ?? container?.querySelector('canvas') ?? null;
      if (!container || !this.box || !this.info || !canvas) {
        return;
      }
      if (!this.active || !widget) {
        this.box.style.display = 'none';
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

      this.box.style.display = 'block';
      this.box.style.left = `${screenLeft}px`;
      this.box.style.top = `${screenTop}px`;
      this.box.style.width = `${screenWidth}px`;
      this.box.style.height = `${screenHeight}px`;
      this.box.style.transform = 'none';
      this.box.style.transformOrigin = '0 0';

      const wTxt = Math.round(screenWidth);
      const hTxt = Math.round(screenHeight);
      this.info.textContent = `${widget.type} · w:${wTxt} h:${hTxt}`;

      const infoRect = this.info.getBoundingClientRect();
      const overTop = infoRect.top < containerRect.top;
      const overRight = infoRect.right > containerRect.right;
      if (overTop) {
        this.info.style.top = '100%';
        this.info.style.bottom = '';
        this.info.style.transform = 'translateY(0)';
      } else {
        this.info.style.top = '0';
        this.info.style.bottom = '';
        this.info.style.transform = 'translateY(-100%)';
      }
      if (overRight) {
        this.info.style.left = '';
        this.info.style.right = '0';
      } else {
        this.info.style.left = '0';
        this.info.style.right = '';
      }
    } catch (err) {
      console.warn('DevTools overlay highlight failed:', err);
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
