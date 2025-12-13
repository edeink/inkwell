import 'antd/dist/reset.css';

import { AimOutlined, CloseOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Input, Popover, Tooltip, Tree, message } from 'antd';
import { useMemo, useRef, useState } from 'react';

import Runtime from '../runtime';

import LayoutPanel, { type LayoutInfo } from './components/layout';
import Overlay from './components/overlay';
import { PropsEditor } from './components/props-editor';
import SimpleTip from './components/simple-tip';
import { getPathKeys, toAntTreeData, toTree } from './helper/tree';
import { useDevtoolsHotkeys } from './hooks/useDevtoolsHotkeys';
import { useMouseInteraction } from './hooks/useMouseInteraction';

import type { Widget } from '../core/base';
import type { DataNode } from 'antd/es/tree';
import type { Key } from 'react';

import { findWidget } from '@/core/helper/widget-selector';

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
  // 是否开启 Inspect
  const [activeInspect, setActiveInspect] = useState<boolean>(false);
  // 面板显隐状态：默认隐藏，热键/按钮控制
  const [visible, setVisible] = useState<boolean>(false);
  const { combo, setCombo } = useDevtoolsHotkeys(
    {
      combo:
        typeof props.shortcut === 'string'
          ? props.shortcut
          : props.shortcut?.combo || 'CmdOrCtrl+Shift+D',
      action:
        typeof props.shortcut === 'object' && props.shortcut?.action
          ? props.shortcut.action
          : 'toggle',
      onToggle: () => setVisible((v) => !v),
      onInspectToggle: () => setActiveInspect((v) => !v),
    },
    [activeInspect, visible],
  );

  const { isMultiRuntime } = useMouseInteraction({
    runtime,
    overlay,
    active: activeInspect,
    getHoverRef: () => hoverRef.current,
    setHoverRef: (w) => {
      hoverRef.current = w;
    },
    setRuntime: (rt) => setRuntime(rt),
    onPick: (current) => {
      setSelected(current);
      const path = getPathKeys(runtime?.getRootWidget?.() ?? null, current.key);
      setExpandedKeys(new Set(path));
      setActiveInspect(false);
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-key="${current.key}"]`);
        (el as HTMLElement | null)?.scrollIntoView?.({ block: 'nearest' });
      });
    },
  });

  return (
    <LayoutPanel
      visible={visible}
      headerLeft={
        <Tooltip title={activeInspect ? 'Inspect 开启' : 'Inspect 关闭'} placement="bottom">
          <Button
            type="text"
            aria-pressed={activeInspect}
            style={{ color: activeInspect ? '#1677ff' : undefined }}
            icon={<AimOutlined />}
            onClick={() => setActiveInspect((v) => !v)}
          />
        </Tooltip>
      }
      headerRightExtra={(requestClose) => (
        <>
          <Popover
            trigger="click"
            placement="bottomRight"
            content={
              <div style={{ width: 260 }}>
                <div style={{ marginBottom: 8 }}>当前快捷键：{combo}</div>
                <Input
                  placeholder="按下组合键以设置"
                  onKeyDown={(e) => {
                    e.preventDefault();
                    const parts: string[] = [];
                    if (e.metaKey || e.ctrlKey) {
                      parts.push('CmdOrCtrl');
                    }
                    if (e.shiftKey) {
                      parts.push('Shift');
                    }
                    if (e.altKey) {
                      parts.push('Alt');
                    }
                    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
                    if (/^[A-Z]$/.test(key)) {
                      parts.push(key);
                    }
                    const next = parts.join('+');
                    const invalid = ['Cmd+Q', 'Command+Q', 'Alt+F4', 'Ctrl+Shift+Esc'];
                    if (invalid.includes(next)) {
                      message.warning('该组合与系统/浏览器快捷键冲突');
                      return;
                    }
                    setCombo(next);
                  }}
                />
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                  建议使用 Cmd/Ctrl + Shift + 字母 的组合
                </div>
              </div>
            }
          >
            <Tooltip title="设置快捷键" placement="bottom">
              <Button type="text" icon={<SettingOutlined />} />
            </Tooltip>
          </Popover>
          <Tooltip title="关闭" placement="bottom">
            <Button type="text" icon={<CloseOutlined />} onClick={() => requestClose()} />
          </Tooltip>
        </>
      )}
      onVisibleChange={setVisible}
      renderTree={(info: LayoutInfo) => (
        <>
          {isMultiRuntime && (
            <SimpleTip
              message={
                '检测到当前页面存在多个 runtime。激活 inspect 模式后，' +
                '将鼠标移动到目标 canvas 上可切换对应的 runtime。'
              }
            />
          )}
          {/* 初始化逻辑会自动选择第一个 runtime，此处无需额外警告 */}
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
                  const w = findWidget(
                    runtime?.getRootWidget?.() ?? null,
                    `#${String(node.key)}`,
                  ) as Widget | null;
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
              const w = findWidget(runtime?.getRootWidget?.() ?? null, `#${k}`) as Widget | null;
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
