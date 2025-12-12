import { CloudDownloadOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import React, { useCallback, useMemo, useRef } from 'react';

import styles from './index.module.less';

import type Runtime from '@/runtime';
import type { JSXElement } from '@/utils/compiler/jsx-runtime';

import { ConnectorElement as Connector } from '@/demo/mindmap/custom-widget/connector';
import { MindMapLayoutElement as MindMapLayout } from '@/demo/mindmap/custom-widget/mindmap-layout';
import { MindMapNodeElement as MindMapNode } from '@/demo/mindmap/custom-widget/mindmap-node';
import { MindMapNodeToolbarElement as MindMapNodeToolbar } from '@/demo/mindmap/custom-widget/mindmap-node-toolbar';
import { ViewportElement as Viewport } from '@/demo/mindmap/custom-widget/viewport';
import { compileTemplate } from '@/utils/compiler/jsx-compiler';

type Props = {
  runtime: Runtime | null;
  width?: number;
  height?: number;
};

type Rect = { x: number; y: number; width: number; height: number };

function findByKey(w: any, key: string): any {
  if (!w) {
    return null;
  }
  if (w.key === key) {
    return w;
  }
  for (const c of w.children) {
    const r = findByKey(c, key);
    if (r) {
      return r;
    }
  }
  return null;
}

function collectGraph(runtime: Runtime): {
  nodes: Array<{ key: string; title: string; prefSide?: 'left' | 'right' }>;
  edges: Array<{ from: string; to: string }>;
  activeKey: string | null;
  viewportSize: { width: number; height: number } | null;
} {
  const root = runtime.getRootWidget();
  if (!root) {
    return { nodes: [], edges: [], activeKey: null, viewportSize: null };
  }
  const vp = findByKey(root, 'v');
  const layout = findByKey(root, 'layout-root');
  const nodes: Array<{ key: string; title: string; prefSide?: 'left' | 'right' }> = [];
  const edges: Array<{ from: string; to: string }> = [];
  const activeKey: string | null = vp?.activeKey ?? null;
  const viewportSize = vp ? { width: vp.width as number, height: vp.height as number } : null;
  if (!layout) {
    return { nodes, edges, activeKey, viewportSize };
  }
  for (const c of layout.children) {
    if (c.type === 'MindMapNode') {
      nodes.push({ key: c.key as string, title: c.title as string, prefSide: c.prefSide });
    } else if (c.type === 'Connector') {
      const fromKey = (c as any).fromKey as string;
      const toKey = (c as any).toKey as string;
      edges.push({ from: fromKey, to: toKey });
    }
  }
  return { nodes, edges, activeKey, viewportSize };
}

function exportBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Toolbar({ runtime, width, height }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const size = useMemo(() => {
    let w = width ?? 0;
    let h = height ?? 0;
    try {
      const container = runtime?.getContainer();
      if (container) {
        w = container.clientWidth;
        h = container.clientHeight;
      }
    } catch {}
    return { width: w, height: h };
  }, [runtime, width, height]);

  const exportToJSON = useCallback(() => {
    if (!runtime) {
      return;
    }
    const g = collectGraph(runtime);
    const json = {
      nodes: g.nodes,
      edges: g.edges,
      activeKey: g.activeKey,
      viewport: g.viewportSize ?? size,
    };
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    exportBlob(blob, `mindmap-${Date.now()}.json`);
  }, [runtime, size]);

  const importFromJSON = useCallback(
    async (data: {
      nodes: Array<{ key: string; title: string; prefSide?: 'left' | 'right' }>;
      edges: Array<{ from: string; to: string }>;
      activeKey?: string | null;
      viewport?: { width: number; height: number };
    }) => {
      if (!runtime) {
        return;
      }
      const vpSize = data.viewport ?? size;
      const children: JSXElement[] = [] as any;
      for (const n of data.nodes) {
        children.push(
          (
            <MindMapNode
              key={n.key}
              title={n.title}
              prefSide={n.prefSide as any}
              active={data.activeKey === n.key}
              activeKey={data.activeKey ?? null}
            />
          ) as unknown as JSXElement,
        );
      }
      for (const e of data.edges) {
        children.push(
          (
            <Connector key={`e-${e.from}-${e.to}`} fromKey={e.from} toKey={e.to} style="elbow" />
          ) as unknown as JSXElement,
        );
      }
      children.push((<MindMapNodeToolbar key="toolbar" />) as unknown as JSXElement);
      const comp = compileTemplate(
        () =>
          (
            <Viewport key="v" scale={1} tx={0} ty={0} width={vpSize.width} height={vpSize.height}>
              <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
                {children as any}
              </MindMapLayout>
            </Viewport>
          ) as unknown as JSXElement,
      );
      await runtime.renderFromJSON(comp);
    },
    [runtime, size],
  );

  const onUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] ?? null;
      if (!f) {
        return;
      }
      const text = await f.text();
      try {
        const data = JSON.parse(text);
        await importFromJSON(data);
      } catch (err) {
        console.error('Import JSON failed:', err);
      } finally {
        e.target.value = '';
      }
    },
    [importFromJSON],
  );

  return (
    <div className={styles.toolbar}>
      <div className={styles.bar}>
        <Tooltip title="导出 JSON">
          <button className={styles.iconBtn} aria-label="导出 JSON" onClick={exportToJSON}>
            <CloudDownloadOutlined />
          </button>
        </Tooltip>
        <Tooltip title="导入 JSON">
          <button className={styles.iconBtn} aria-label="导入 JSON" onClick={onUploadClick}>
            <CloudUploadOutlined />
          </button>
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
      </div>
    </div>
  );
}
