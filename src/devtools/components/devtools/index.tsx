import { AimOutlined, CloseOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Tooltip, Tree } from 'antd';
import { useMemo, useRef, useState } from 'react';

import Runtime from '../../../runtime';
import { computePromptInfo } from '../../helper/prompt';
import { findByKey, getPathKeys, toAntTreeData, toTree } from '../../helper/tree';
import { useMouseInteraction } from '../../hooks/useMouseInteraction';
import LayoutPanel, { type LayoutInfo } from '../layout';
import Overlay from '../overlay';
import { PropsEditor } from '../props-editor';

import type { Widget } from '../../../core/base';
import type { DataNode } from 'antd/es/tree';
import type { Key } from 'react';

/**
 * DevTools
 * 功能：提供 Inspect、高亮与树浏览，支持属性编辑、布局与尺寸调节
 * 参数：editor - 编辑器实例；onClose - 关闭回调（可选）
 * 返回：DevTools 组件
 */
export interface DevToolsProps {
  onClose?: () => void;
  /** 快捷键配置：字符串或对象（默认 Ctrl/Cmd+Shift+D 切换面板显示） */
  shortcut?: string | { combo: string; action?: 'toggle' | 'inspect' };
}

export function DevTools(props: DevToolsProps) {
  const [selected, setSelected] = useState<Widget | null>(null);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const hoverRef = useRef<Widget | null>(null);
  const tree = useMemo(() => toTree(runtime?.getRootWidget?.() ?? null), [runtime]);
  const overlay = useMemo(() => (runtime ? new Overlay(runtime) : null), [runtime]);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState<string>('');
  const [active, setActive] = useState<boolean>(false);

  useMouseInteraction({
    runtime,
    overlay,
    active,
    getHoverRef: () => hoverRef.current,
    setHoverRef: (w) => {
      hoverRef.current = w;
    },
    setRuntime: (rt) => setRuntime(rt),
    onPick: (current) => {
      setSelected(current);
      const path = getPathKeys(runtime?.getRootWidget?.() ?? null, current.key);
      setExpandedKeys(new Set(path));
      setActive(false);
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-key="${current.key}"]`);
        (el as HTMLElement | null)?.scrollIntoView?.({ block: 'nearest' });
      });
    },
  });

  const runtimeReady = !!runtime && !!runtime.getContainer?.() && !!runtime.getRootWidget?.();

  return (
    <LayoutPanel
      headerLeft={
        <Tooltip title={active ? 'Inspect 开启' : 'Inspect 关闭'} placement="bottom">
          <Button
            type="text"
            aria-pressed={active}
            style={{ color: active ? '#1677ff' : undefined }}
            icon={<AimOutlined />}
            onClick={() => setActive((v) => !v)}
          />
        </Tooltip>
      }
      headerRightExtra={(requestClose) => (
        <Tooltip title="关闭" placement="bottom">
          <Button type="text" icon={<CloseOutlined />} onClick={() => requestClose()} />
        </Tooltip>
      )}
      onClose={() => props.onClose?.()}
      renderTree={(info: LayoutInfo) => (
        <>
          {(() => {
            const { multi, overlapCount } = computePromptInfo(Runtime.listCanvas());
            return (
              <>
                {multi && (
                  <Alert
                    type="info"
                    showIcon
                    message="当前页面发现多个 runtime，请 inspect 到具体 canvas 上以激活"
                    description={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{ width: 12, height: 12, background: '#1677ff', borderRadius: 2 }}
                        />
                        <span>将鼠标移动到目标画布区域以激活对应 runtime</span>
                      </div>
                    }
                    style={{ marginBottom: 8 }}
                  />
                )}
                {overlapCount > 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    message="检测到多个 canvas 重叠，可能导致定位不准确"
                    description={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            background: 'rgba(255,85,85,0.6)',
                            borderRadius: 2,
                          }}
                        />
                        <span>请在重叠区域外进行 Inspect，或调整画布布局</span>
                      </div>
                    }
                    style={{ marginBottom: 8 }}
                  />
                )}
              </>
            );
          })()}
          {!runtimeReady && (
            <Alert
              type="warning"
              showIcon
              message="未找到 Runtime 或画布"
              description="请先运行示例代码，或等待画布初始化完成。"
              style={{ marginBottom: 8 }}
            />
          )}
          <div style={{ marginBottom: 8 }}>
            <Input.Search
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索节点..."
              allowClear
            />
          </div>
          <Tree
            showLine
            height={
              info.isNarrow
                ? Math.max(120, info.treeHeight - 60)
                : info.dock === 'top' || info.dock === 'bottom'
                  ? Math.max(120, info.height - 100)
                  : undefined
            }
            treeData={toAntTreeData(tree) as DataNode[]}
            titleRender={(node) => (
              <span
                data-key={String(node.key)}
                onMouseEnter={() => {
                  const w = findByKey(runtime?.getRootWidget?.() ?? null, String(node.key));
                  hoverRef.current = w;
                  overlay?.setActive(true);
                  overlay?.highlight(w);
                }}
                onMouseLeave={() => {
                  overlay?.setActive(false);
                  overlay?.highlight(null);
                }}
              >
                {String(node.title)}
              </span>
            )}
            expandedKeys={Array.from(expandedKeys)}
            onExpand={(keys: Key[]) => setExpandedKeys(new Set(keys as string[]))}
            selectedKeys={selected ? [selected.key] : []}
            onSelect={(keys: Key[]) => {
              const k = String(keys[0]);
              const w = findByKey(runtime?.getRootWidget?.() ?? null, k);
              setSelected(w);
              if (w) {
                const path = getPathKeys(runtime?.getRootWidget?.() ?? null, k);
                setExpandedKeys(new Set(path));
              }
            }}
            filterTreeNode={(node) =>
              !!search && String(node.title).toLowerCase().includes(search.toLowerCase())
            }
          />
        </>
      )}
      renderProps={() => <PropsEditor widget={selected} onChange={() => runtime?.rebuild()} />}
    />
  );
}
