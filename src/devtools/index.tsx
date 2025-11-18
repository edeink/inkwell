import { AimOutlined, AlignLeftOutlined, AlignRightOutlined, CaretDownOutlined, CaretRightOutlined, CloseOutlined, VerticalAlignBottomOutlined, VerticalAlignTopOutlined } from "@ant-design/icons";
import { Button, ColorPicker, Input, InputNumber, Space, Tooltip, Tree } from "antd";
import "antd/dist/reset.css";
// remove ButtonGroup to avoid borders, use simple flex container
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Widget } from "../core/base";
import type Editor from "../editors/graphics-editor";
import dtStyles from "./devtools.module.less";
import { Overlay, hitTest } from "./overlay";

function toTree(node: Widget | null): any {
  if (!node) return null;
  return {
    key: node.key,
    type: node.type,
    props: { ...node.data, children: undefined },
    children: node.children.map((c) => toTree(c)),
  };
}

function ObjectEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const entries = Object.entries(value || {});
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  function isColor(val: any): boolean {
    if (typeof val !== "string") return false;
    const s = val.trim().toLowerCase();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(s)) return true;
    if (/^rgb\s*\(/.test(s)) return true;
    if (/^rgba\s*\(/.test(s)) return true;
    if (/^hsl\s*\(/.test(s)) return true;
    return false;
  }
  function setKV(oldKey: string, newKey: string, newVal: any) {
    const next: any = { ...value };
    if (oldKey !== newKey) {
      delete next[oldKey];
      next[newKey] = newVal;
    } else {
      next[oldKey] = newVal;
    }
    onChange(next);
  }
  function removeKey(k: string) {
    const next: any = { ...value };
    delete next[k];
    onChange(next);
  }
  function addKey() {
    const base = "key";
    let i = 1;
    let k = `${base}${i}`;
    while (value && Object.prototype.hasOwnProperty.call(value, k)) { i += 1; k = `${base}${i}`; }
    const next: any = { ...value, [k]: "" };
    onChange(next);
  }
  return (
    <div className={dtStyles.kvGroup}>
      {entries.map(([k, v]) => {
        const isObj = v && typeof v === "object" && !Array.isArray(v);
        const isOpen = !!openMap[k] || !isObj;
        return (
          <div key={k} className={dtStyles.kvRow}>
            <Space>
              {isObj && (
                <Button size="small" type="text" icon={
                  isOpen ?
                    <CaretDownOutlined /> :
                    <CaretRightOutlined />
                } onClick={() => setOpenMap({ ...openMap, [k]: !isOpen })} />
              )}
              <Tooltip title={k}><Input className={dtStyles.kvKey} value={k} onChange={(e) => setKV(k, e.target.value, v)} /></Tooltip>
            </Space>
            {isObj ? (
              isOpen ? (
                <div className={dtStyles.kvNested}>
                  <ObjectEditor value={v} onChange={(nv) => setKV(k, k, nv)} />
                </div>
              ) : (
                <div />
              )
            ) : (
              isColor(v) ? (
                <Space>
                  <Input className={dtStyles.kvValue} value={String(v ?? "")} onChange={(e) => setKV(k, k, e.target.value)} />
                  <ColorPicker value={String(v ?? "")} onChangeComplete={(c) => setKV(k, k, c.toHexString())} />
                </Space>
              ) : (typeof v === "number" ? (
                <InputNumber className={dtStyles.kvValue} value={Number(v)} onChange={(num) => setKV(k, k, Number(num))} />
              ) : (
                <Input className={dtStyles.kvValue} value={String(v ?? "")} onChange={(e) => setKV(k, k, e.target.value)} />
              ))
            )}
            <Button size="small" className={dtStyles.btnText} icon={<CloseOutlined />} onClick={() => removeKey(k)} />
          </div>
        );
      })}
      <div className={dtStyles.kvActions}>
        <Button type="dashed" onClick={addKey}>添加属性</Button>
      </div>
    </div>
  );
}

function PropsEditor({ widget, onChange }: { widget: Widget | null; onChange: () => void }) {
  const [local, setLocal] = useState<any>(widget ? { ...widget.data } : {});
  useEffect(() => {
    setLocal(widget ? { ...widget.data } : {});
  }, [widget]);
  function updateField(path: string, value: any) {
    const next = { ...local };
    const parts = path.split(".");
    let obj: any = next;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]] ?? (obj[parts[i]] = {});
    obj[parts[parts.length - 1]] = value;
    setLocal(next);
  }
  function apply() {
    if (!widget) return;
    widget.data = { ...widget.data, ...local } as any;
    widget.createElement(widget.data as any);
    onChange();
  }
  if (!widget) return <div className={dtStyles.emptyHint}>未选择节点</div>;
  const entries = Object.entries(local).filter(([k]) => k !== "type" && k !== "children");
  return (
    <>
      {entries.map(([k, v]) => (
        <div key={k} className={dtStyles.formRow}>
          <label className={dtStyles.formLabel} title={k}>{k}</label>
          {v && typeof v === "object" && !Array.isArray(v) ? (
            <ObjectEditor value={v} onChange={(nv) => updateField(k, nv)} />
          ) : (
            <Input
              className={dtStyles.formInput}
              value={String(v ?? "")}
              onChange={(e) => updateField(k, e.target.value)}
            />
          )}
        </div>
      ))}
      <div className={dtStyles.formActions}>
        <Button type="primary" onClick={apply}>应用</Button>
      </div>
    </>
  );
}

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
    } catch { }
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
    try { const raw = localStorage.getItem(splitStorageKey); if (raw) return JSON.parse(raw); } catch { }
    return { treeWidth: 300 } as { treeWidth: number };
  })();
  const [treeWidth, setTreeWidth] = useState<number>(initialSplit.treeWidth);
  const [splitDragging, setSplitDragging] = useState<boolean>(false);

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
      window.removeEventListener("resize", onWindowResize as any);
      window.removeEventListener("scroll", onWindowScroll as any);
      // disconnect mutation observer if created
      // Using try/catch to avoid reference issues
      try { (mo as MutationObserver | null)?.disconnect?.(); } catch { }
      overlay.unmount();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [editor, overlay, active]);

  useEffect(() => {
    (window as any).__INKWELL_DEVTOOLS = {
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
    try { localStorage.setItem(storageKey, JSON.stringify({ dock, width, height })); } catch { }
  }, [dock, width, height]);

  useEffect(() => {
    try { localStorage.setItem(splitStorageKey, JSON.stringify({ treeWidth })); } catch { }
  }, [treeWidth]);

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
    const startW = treeWidth;
    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      const next = clamp(startW + dx, 200, Math.min(((dock === "left" || dock === "right") ? width : window.innerWidth) - 240, 800));
      setTreeWidth(next);
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
  const panelClass = [dtStyles.panel, dtStyles[`dock-${dock}`]].join(" ");
  const handleClass = [dtStyles.resizeHandle, dtStyles[`handle-${dock}`], resizing ? dtStyles.handleActive : dtStyles.handleIdle].join(" ");

  return (
    <div
      ref={panelRef}
      className={[panelClass, closing ? dtStyles.closing : ""].join(" ")}
      style={dock === "top" || dock === "bottom" ? { height } : { width }}
    >
      <div className={dtStyles.header}>
        <div className={dtStyles.headerLeft}>
          <Tooltip title={active ? "Inspect 开启" : "Inspect 关闭"} placement="bottom">
            <Button type="text" className={active ? dtStyles.btnTextPrimary : dtStyles.btnText} icon={<AimOutlined />} onClick={() => setActive((v) => !v)} />
          </Tooltip>
        </div>
        <div className={dtStyles.headerRight}>
          <div style={{ display: "flex", gap: 6 }}>
            <Tooltip title="靠左" placement="bottom">
              <Button type="text" className={dtStyles.btnText} icon={<AlignLeftOutlined />} onClick={() => setDock("left")} />
            </Tooltip>
            <Tooltip title="靠右" placement="bottom">
              <Button type="text" className={dtStyles.btnText} icon={<AlignRightOutlined />} onClick={() => setDock("right")} />
            </Tooltip>
            <Tooltip title="靠上" placement="bottom">
              <Button type="text" className={dtStyles.btnText} icon={<VerticalAlignTopOutlined />} onClick={() => setDock("top")} />
            </Tooltip>
            <Tooltip title="靠下" placement="bottom">
              <Button type="text" className={dtStyles.btnText} icon={<VerticalAlignBottomOutlined />} onClick={() => setDock("bottom")} />
            </Tooltip>
          </div>
          <Tooltip title="关闭" placement="bottom">
            <Button type="text" className={dtStyles.btnText} icon={<CloseOutlined />} onClick={() => { setClosing(true); setTimeout(() => onClose?.(), 180); }} />
          </Tooltip>
        </div>
      </div>
      <div
        className={dtStyles.contentGrid}
        style={{ gridTemplateColumns: `${treeWidth}px 4px 1fr`, ...(dock === "top" || dock === "bottom" ? { height: `calc(${height}px - 42px)` } : { height: "calc(100vh - 42px)" }) }}
      >
        <div className={dtStyles.treePane}>
          <div style={{ marginBottom: 8 }}>
            <Input.Search value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索节点..." allowClear />
          </div>
          <Tree
            showLine
            height={dock === "top" || dock === "bottom" ? Math.max(120, height - 100) : undefined}
            treeData={toAntTreeData(tree)}
            expandedKeys={Array.from(expandedKeys)}
            onExpand={(keys) => setExpandedKeys(new Set(keys as string[]))}
            selectedKeys={selected ? [selected.key] : []}
            onSelect={(keys) => (window as any).__INKWELL_DEVTOOLS.selectByKey(String(keys[0]))}
            filterTreeNode={(node) => !!search && String(node.title).toLowerCase().includes(search.toLowerCase())}
          />
        </div>
        <div className={[dtStyles.splitHandle, splitDragging ? dtStyles.splitActive : dtStyles.splitIdle].join(" ")} onMouseDown={onSplitMouseDown} />
        <div className={dtStyles.propsPane}>
          <PropsEditor widget={selected} onChange={() => editor.rebuild()} />
        </div>
      </div>
      <div onMouseDown={onResizeMouseDown} className={handleClass} style={{ cursor }} />
    </div>
  );
}

type Dock = "left" | "right" | "top" | "bottom";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// styles migrated to devtools.module.less

function findByKey(root: Widget | null, k: string): Widget | null {
  if (!root) return null;
  if (root.key === k) return root;
  for (const c of root.children) {
    const r = findByKey(c, k);
    if (r) return r;
  }
  return null;
}

function toAntTreeData(node: any): any[] {
  if (!node) return [];
  function wrap(n: any): any {
    return {
      title: `${n.type} [${n.key}]`,
      key: n.key,
      children: (n.children || []).map((c: any) => wrap(c)),
    };
  }
  return [wrap(node)];
}
function getPathKeys(root: Widget | null, k: string): string[] {
  const path: string[] = [];
  function dfs(node: Widget | null): boolean {
    if (!node) return false;
    path.push(node.key);
    if (node.key === k) return true;
    for (const c of node.children) {
      if (dfs(c)) return true;
    }
    path.pop();
    return false;
  }
  dfs(root);
  return path;
}