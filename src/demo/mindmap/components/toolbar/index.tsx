import { CloudDownloadOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import React, { useCallback, useMemo, useRef } from 'react';

import { Connector } from '../../custom-widget/connector';
import { MindMapNode } from '../../custom-widget/mindmap-node';
import { CustomComponentType } from '../../custom-widget/type';

import styles from './index.module.less';

import type { MindMapLayout } from '../../custom-widget/mindmap-layout';
import type { MindMapViewport } from '../../custom-widget/mindmap-viewport';
import type Runtime from '@/runtime';

import { findWidget } from '@/core/helper/widget-selector';

type Props = {
  runtime: Runtime | null;
  width?: number;
  height?: number;
};

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
  const vp = findWidget<MindMapViewport>(
    root,
    CustomComponentType.MindMapViewport,
  ) as MindMapViewport | null;
  const layout = findWidget(root, CustomComponentType.MindMapLayout) as MindMapLayout | null;
  const nodes: Array<{ key: string; title: string; prefSide?: 'left' | 'right' }> = [];
  const edges: Array<{ from: string; to: string }> = [];
  const activeKey: string | null = vp?.activeKey ?? null;
  const viewportSize = vp ? { width: vp.width as number, height: vp.height as number } : null;
  if (!layout) {
    return { nodes, edges, activeKey, viewportSize };
  }
  for (const c of layout.children) {
    if (c instanceof MindMapNode) {
      nodes.push({ key: c.key as string, title: c.title as string, prefSide: c.prefSide });
    } else if (c instanceof Connector) {
      const fromKey = c.fromKey as string;
      const toKey = c.toKey as string;
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
      const container = runtime?.container;
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
    async (_data: {
      nodes: Array<{ key: string; title: string; prefSide?: 'left' | 'right' }>;
      edges: Array<{ from: string; to: string }>;
      activeKey?: string | null;
      viewport?: { width: number; height: number };
    }) => {
      if (!runtime) {
        return;
      }
    },
    [runtime],
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
