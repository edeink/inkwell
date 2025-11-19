import { AimOutlined, AlignLeftOutlined, AlignRightOutlined, CloseOutlined, VerticalAlignBottomOutlined, VerticalAlignTopOutlined } from "@ant-design/icons";
import { Button, Input, Tooltip, Tree } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { clamp } from "../../helper/math";
import { findByKey, getPathKeys, toAntTreeData, toTree } from "../../helper/tree";
import { Overlay, hitTest } from "../overlay";
import { PropsEditor } from "../props-editor";

import styles from "./index.module.less";

import type { Widget } from "../../../core/base";
import type Editor from "../../../editors/graphics-editor";

/**
 * DevTools
 * 功能：提供 Inspect、高亮与树浏览，支持属性编辑、布局与尺寸调节
 * 参数：editor - 编辑器实例；onClose - 关闭回调（可选）
 * 返回：DevTools 组件
 */
export function DevTools({ editor, onClose }: { editor: Editor; onClose?: () => void }) {
  const [selected, setSelected] = useState<Widget | null>(null);
  const hoverRef = useRef<Widget | null>(null);
  const tree = useMemo(() => toTree(editor.getRootWidget()), [editor]);
  const overlay = useMemo(() => new Overlay(editor), [editor]);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState<string>("");

  const storageKey = "INKWELL_DEVTOOLS_LAYOUT";
  const initialLayout = (() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch { void 0; }
    return { dock: "right", width: 380, height: Math.min(window.innerHeight, 420) } as { dock: Dock; width: number; height: number };
  })();
  const [dock, setDock] = useState<Dock>(initialLayout.dock);
  const [width, setWidth] = useState<number>(initialLayout.width);
  const [height, setHeight] = useState<number>(initialLayout.height);
  const [resizing, setResizing] = useState<boolean>(false);
  const [active, setActive] = useState<boolean>(false);
  const [closing, setClosing] = useState<boolean>(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const splitStorageKey = "INKWELL_DEVTOOLS_SPLIT";
  const initialSplit = (() => {
    try { const raw = localStorage.getItem(splitStorageKey); if (raw) return JSON.parse(raw); } catch { void 0; }
    return { treeWidth: 300, treeHeight: 240 } as { treeWidth: number; treeHeight: number };
  })();
  const [treeWidth, setTreeWidth] = useState<number>(initialSplit.treeWidth);
  const [treeHeight, setTreeHeight] = useState<number>(initialSplit.treeHeight);
  const [splitDragging, setSplitDragging] = useState<boolean>(false);
  const [isNarrow, setIsNarrow] = useState<boolean>(false);

  useEffect(() => {
    overlay.mount();
    overlay.setActive(active);
    const renderer = editor.getRenderer();
    const raw = renderer?.getRawInstance?.() as CanvasRenderingContext2D | null;
    const canvas = raw?.canvas ?? editor.getContainer()?.querySelector("canvas");
    let lastEvent: MouseEvent | null = null;
    let raf = 0;
    const onWindowResize = () => overlay.highlight(hoverRef.current);
    const onWindowScroll = () => overlay.highlight(hoverRef.current);
    let mo: MutationObserver | null = null;
    function schedule() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!lastEvent || !active) return;
        const rect = (canvas as HTMLCanvasElement).getBoundingClientRect();
        const x = lastEvent.clientX - rect.left;
        const y = lastEvent.clientY - rect.top;
        const target = hitTest(editor.getRootWidget(), x, y);
        hoverRef.current = target;
        overlay.highlight(target);
      });
    }
    function onMove(e: MouseEvent) {
      lastEvent = e;
      schedule();
    }
    function onClick() {
      const current = hoverRef.current;
      if (active && current) {
        setSelected(current);
        const path = getPathKeys(editor.getRootWidget(), current.key);
        setExpandedKeys(new Set(path));
        setActive(false);
        overlay.setActive(false);
        overlay.highlight(null);
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-key="${current.key}"]`);
          (el as HTMLElement | null)?.scrollIntoView?.({ block: "nearest" });
        });
      }
    }
    if (active) {
      canvas?.addEventListener("mousemove", onMove);
      canvas?.addEventListener("click", onClick);
      window.addEventListener("resize", onWindowResize);
      window.addEventListener("scroll", onWindowScroll, { passive: true });
      if (canvas) {
        mo = new MutationObserver(() => overlay.highlight(hoverRef.current));
        mo.observe(canvas, { attributes: true, attributeFilter: ["style", "class"] });
      }
    }
    return () => {
      canvas?.removeEventListener("mousemove", onMove);
      canvas?.removeEventListener("click", onClick);
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("scroll", onWindowScroll);
      try { (mo as MutationObserver | null)?.disconnect?.(); } catch { void 0; }
      overlay.unmount();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [editor, overlay, active]);

  useEffect(() => {
    const updateNarrow = () => {
      const w = panelRef.current?.clientWidth ?? (dock === "left" || dock === "right" ? width : window.innerWidth);
      setIsNarrow(w < 600);
    };
    updateNarrow();
    window.addEventListener("resize", updateNarrow);
    return () => window.removeEventListener("resize", updateNarrow);
  }, [dock, width]);

  useEffect(() => {
    window.__INKWELL_DEVTOOLS = {
      getTree: () => tree,
      selectByKey: (k: string) => {
        const w = findByKey(editor.getRootWidget(), k);
        setSelected(w);
        overlay.highlight(w);
        const path = getPathKeys(editor.getRootWidget(), k);
        setExpandedKeys(new Set(path));
      },
      setDock: (d: Dock) => setDock(d),
      setSize: (w: number, h: number) => { setWidth(w); setHeight(h); },
      setActive: (v: boolean) => setActive(v),
    };
  }, [tree, editor, overlay]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ dock, width, height })); } catch { void 0; }
  }, [dock, width, height]);

  useEffect(() => {
    try { localStorage.setItem(splitStorageKey, JSON.stringify({ treeWidth, treeHeight })); } catch { void 0; }
  }, [treeWidth, treeHeight]);

  function onResizeMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = width;
    const startH = height;
    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (dock === "right") setWidth(clamp(startW - dx, 260, Math.min(window.innerWidth - 80, 900)));
      if (dock === "left") setWidth(clamp(startW + dx, 260, Math.min(window.innerWidth - 80, 900)));
      if (dock === "top") setHeight(clamp(startH + dy, 200, Math.min(window.innerHeight - 80, 800)));
      if (dock === "bottom") setHeight(clamp(startH - dy, 200, Math.min(window.innerHeight - 80, 800)));
    }
    function onUp() {
      setResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function onSplitMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setSplitDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = treeWidth;
    const startH = treeHeight;
    function onMove(ev: MouseEvent) {
      if (isNarrow) {
        const dy = ev.clientY - startY;
        const maxH = Math.max(160, (dock === "top" || dock === "bottom") ? height - 160 : window.innerHeight - 200);
        const nextH = clamp(startH + dy, 140, maxH);
        setTreeHeight(nextH);
      } else {
        const dx = ev.clientX - startX;
        const next = clamp(startW + dx, 200, Math.min(((dock === "left" || dock === "right") ? width : window.innerWidth) - 240, 800));
        setTreeWidth(next);
      }
    }
    function onUp() {
      setSplitDragging(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const cursor = dock === "top" || dock === "bottom" ? "ns-resize" : "ew-resize";
  const panelClass = [styles.panel, styles[`dock-${dock}`]].join(" ");
  const handleClass = [styles.resizeHandle, styles[`handle-${dock}`], resizing ? styles.handleActive : styles.handleIdle].join(" ");

  return (
    <div ref={panelRef} className={[panelClass, closing ? styles.closing : ""].join(" ")} style={dock === "top" || dock === "bottom" ? { height } : { width }}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Tooltip title={active ? "Inspect 开启" : "Inspect 关闭"} placement="bottom">
            <Button type="text" className={active ? styles.btnTextPrimary : styles.btnText} icon={<AimOutlined />} onClick={() => setActive((v) => !v)} />
          </Tooltip>
        </div>
        <div className={styles.headerRight}>
          <div style={{ display: "flex", gap: 6 }}>
            <Tooltip title="靠左" placement="bottom">
              <Button type="text" className={styles.btnText} icon={<AlignLeftOutlined />} onClick={() => setDock("left")} />
            </Tooltip>
            <Tooltip title="靠右" placement="bottom">
              <Button type="text" className={styles.btnText} icon={<AlignRightOutlined />} onClick={() => setDock("right")} />
            </Tooltip>
            <Tooltip title="靠上" placement="bottom">
              <Button type="text" className={styles.btnText} icon={<VerticalAlignTopOutlined />} onClick={() => setDock("top")} />
            </Tooltip>
            <Tooltip title="靠下" placement="bottom">
              <Button type="text" className={styles.btnText} icon={<VerticalAlignBottomOutlined />} onClick={() => setDock("bottom")} />
            </Tooltip>
          </div>
          <Tooltip title="关闭" placement="bottom">
            <Button type="text" className={styles.btnText} icon={<CloseOutlined />} onClick={() => { setClosing(true); setTimeout(() => onClose?.(), 180); }} />
          </Tooltip>
        </div>
      </div>
      <div className={[styles.contentGrid, isNarrow ? styles.narrow : ""].join(" ")} style={
        isNarrow
          ? { gridTemplateRows: `${treeHeight}px 8px 1fr`, ...(dock === "top" || dock === "bottom" ? { height: `calc(${height}px - 42px)` } : { height: "calc(100vh - 42px)" }) }
          : { gridTemplateColumns: `${treeWidth}px 8px 1fr`, ...(dock === "top" || dock === "bottom" ? { height: `calc(${height}px - 42px)` } : { height: "calc(100vh - 42px)" }) }
      }>
        <div className={styles.treePane} style={isNarrow ? { gridRow: "1 / 2" } : undefined}>
          <div style={{ marginBottom: 8 }}>
            <Input.Search value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索节点..." allowClear />
          </div>
          <Tree
            showLine
            height={isNarrow ? Math.max(120, treeHeight - 60) : (dock === "top" || dock === "bottom" ? Math.max(120, height - 100) : undefined)}
            treeData={toAntTreeData(tree)}
            expandedKeys={Array.from(expandedKeys)}
            onExpand={(keys) => setExpandedKeys(new Set(keys as string[]))}
            selectedKeys={selected ? [selected.key] : []}
            onSelect={(keys) => window.__INKWELL_DEVTOOLS.selectByKey(String(keys[0]))}
            filterTreeNode={(node) => !!search && String(node.title).toLowerCase().includes(search.toLowerCase())}
          />
        </div>
        <div className={[styles.splitHandle, splitDragging ? styles.splitActive : styles.splitIdle].join(" ")} onMouseDown={onSplitMouseDown} style={isNarrow ? { gridRow: "2 / 3", cursor: "row-resize" } : { gridColumn: "2 / 3", cursor: "col-resize" }} />
        <div className={styles.propsPane} style={isNarrow ? { gridRow: "3 / 4" } : undefined}>
          <PropsEditor widget={selected} onChange={() => editor.rebuild()} />
        </div>
      </div>
      <div onMouseDown={onResizeMouseDown} className={handleClass} style={{ cursor }} />
    </div>
  );
}

type Dock = "left" | "right" | "top" | "bottom";

declare global {
  interface Window {
    __INKWELL_DEVTOOLS: {
      getTree: () => ReturnType<typeof toTree>;
      selectByKey: (k: string) => void;
      setDock: (d: Dock) => void;
      setSize: (w: number, h: number) => void;
      setActive: (v: boolean) => void;
    };
  }
}