import styles from "./overlay.module.less";

import type { Widget } from "../core/base";
import type Editor from "../editors/graphics-editor";

export class Overlay {
  private editor: Editor;
  private box: HTMLDivElement | null = null;
  private info: HTMLDivElement | null = null;
  private active = false;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  mount(): void {
    const container = this.editor.getContainer();
    if (!container) return;
    try {
      const computed = window.getComputedStyle(container);
      if (computed.position === "static") {
        container.style.position = "relative";
      }
    } catch (e) {
      console.debug("DevTools overlay: unable to set container position", e);
    }
    const box = document.createElement("div");
    box.className = styles.overlayBox;
    const info = document.createElement("div");
    info.className = styles.overlayInfo;
    box.appendChild(info);
    if (import.meta.env?.DEV) {
      const guideH = document.createElement("div");
      guideH.className = styles.guideH;
      const guideV = document.createElement("div");
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
  }

  setActive(v: boolean): void {
    this.active = v;
    if (this.box && !v) this.box.style.display = "none";
  }

  highlight(widget: Widget | null): void {
    try {
      const container = this.editor.getContainer();
      const renderer = this.editor.getRenderer();
      const raw = renderer?.getRawInstance?.() as CanvasRenderingContext2D | null;
      const canvas = raw?.canvas ?? container?.querySelector("canvas") ?? null;
      if (!container || !this.box || !this.info || !canvas) return;
      if (!this.active || !widget) {
        this.box.style.display = "none";
        return;
      }
      const containerRect = container.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const cssTransform = window.getComputedStyle(canvas).transform;
      const cssOrigin = window.getComputedStyle(canvas).transformOrigin;
      const offsetX = canvasRect.left - containerRect.left;
      const offsetY = canvasRect.top - containerRect.top;

      const pos = widget.getAbsolutePosition();
      const { width, height } = widget.renderObject.size;

      this.box.style.display = "block";
      this.box.style.left = `${pos.dx + offsetX}px`;
      this.box.style.top = `${pos.dy + offsetY}px`;
      this.box.style.width = `${width}px`;
      this.box.style.height = `${height}px`;

      // Mirror canvas CSS transform (if any) for precise alignment
      if (cssTransform && cssTransform !== "none") {
        this.box.style.transform = cssTransform;
        this.box.style.transformOrigin = cssOrigin || "0 0";
      } else {
        this.box.style.transform = "none";
      }

      this.info.textContent = `${widget.type} · x:${Math.round(pos.dx)} y:${Math.round(pos.dy)} · w:${Math.round(width)} h:${Math.round(height)}`;
    } catch (err) {
      console.warn("DevTools overlay highlight failed:", err);
    }
  }
}

export function hitTest(root: Widget | null, x: number, y: number): Widget | null {
  if (!root) return null;
  let found: Widget | null = null;
  function dfs(node: Widget): void {
    const pos = node.getAbsolutePosition();
    const { width, height } = node.renderObject.size;
    if (x >= pos.dx && x <= pos.dx + width && y >= pos.dy && y <= pos.dy + height) {
      found = node;
      for (const child of node.children) dfs(child);
    }
  }
  dfs(root);
  return found;
}