import { AimOutlined, CloseOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Input, Popover, Tooltip, Tree, message } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

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
/**
 * IDevtools
 * 单例 DevTools 管理接口：用于全局唯一实例的获取、销毁与重置。
 */
export interface IDevtools {
  /** 获取当前是否已挂载到页面 */
  isMounted(): boolean;
  /** 主动显示面板（如果面板组件支持外部控制） */
  show(): void;
  /** 主动隐藏面板（如果面板组件支持外部控制） */
  hide(): void;
  /** 销毁当前实例并移除挂载的节点 */
  dispose(): void;
}

/**
 * DevToolsPanel
 * 说明：原 DevTools 组件重命名为面板组件，由单例管理类统一挂载至全局。
 */
function DevToolsPanel(props: DevToolsProps) {
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
  const { combo, setCombo } = useDevtoolsHotkeys({
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
  });

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

/**
 * Devtools（单例管理类）
 * 目标：在整个应用范围内确保仅存在一个 DevTools 面板实例。
 * - 使用双重检查锁定（DCL）保证并发初始化安全。
 * - 提供 dispose/reset 生命周期管理以适配测试环境。
 */
export class Devtools implements IDevtools {
  private static _instance: Devtools | null = null;
  private static _initializing: Promise<Devtools> | null = null;

  // 宿主容器与 React Root
  private container: HTMLDivElement | null = null;
  private root: Root | null = null;
  private disposed = false;
  private props: DevToolsProps | undefined;

  // 私有构造以防外部实例化
  private constructor(props?: DevToolsProps) {
    this.props = props;
    this.mount();
  }

  /**
   * 同步获取实例（快速路径）：
   * - 若已存在实例，直接返回；
   * - 否则创建并返回新实例。
   */
  static getInstance(props?: DevToolsProps): Devtools {
    const inst = Devtools._instance;
    if (inst && !inst.disposed) {
      return inst;
    }
    // 创建新实例（JS 单线程环境下无需锁）。
    const created = new Devtools(props);
    Devtools._instance = created;
    return created;
  }

  /**
   * 并发安全获取实例（异步）：
   * - 使用 DCL + 初始化 Promise，避免竞争条件。
   */
  static async getInstanceAsync(props?: DevToolsProps): Promise<Devtools> {
    const inst = Devtools._instance;
    if (inst && !inst.disposed) {
      return inst;
    }
    if (!Devtools._initializing) {
      Devtools._initializing = (async () => {
        // 第二次检查，避免重复创建
        if (Devtools._instance && !Devtools._instance.disposed) {
          return Devtools._instance;
        }
        const created = new Devtools(props);
        Devtools._instance = created;
        return created;
      })();
    }
    const result = await Devtools._initializing;
    Devtools._initializing = null; // 释放初始化占位，减少后续锁竞争
    return result;
  }

  /**
   * 是否已挂载到页面
   */
  isMounted(): boolean {
    return !!this.root && !!this.container && !this.disposed;
  }

  /**
   * 主动显示面板（当前面板内自管可视状态，这里仅确保挂载存在）
   */
  show(): void {
    if (!this.isMounted()) {
      this.mount();
    }
  }

  /**
   * 主动隐藏面板（当前实现保持组件内部控制，此处不卸载以保留状态）
   */
  hide(): void {
    // 保持挂载，显示/隐藏由面板热键与操作控制
  }

  /**
   * 销毁实例并移除挂载容器
   */
  dispose(): void {
    if (this.root) {
      try {
        this.root.unmount();
      } catch {}
      this.root = null;
    }
    if (this.container) {
      try {
        this.container.remove();
      } catch {}
      this.container = null;
    }
    this.disposed = true;
    Devtools._instance = null;
    Devtools._initializing = null;
  }

  /**
   * 重置（测试辅助）：等价于 dispose，但确保静态状态清空
   */
  static reset(): void {
    if (Devtools._instance) {
      Devtools._instance.dispose();
    }
    Devtools._instance = null;
    Devtools._initializing = null;
  }

  /**
   * 重新渲染以应用新的 props
   */
  update(props?: DevToolsProps): void {
    this.props = props ?? this.props;
    if (this.root && this.container) {
      this.root.render(<DevToolsPanel {...(this.props ?? {})} />);
    }
  }

  /**
   * 创建并挂载全局容器到 document.body，并渲染面板
   */
  private mount(): void {
    if (this.disposed) {
      this.disposed = false;
    }
    const existing = document.getElementById('inkwell-devtools-root');
    this.container = existing as HTMLDivElement | null;
    if (!this.container) {
      const el = document.createElement('div');
      el.id = 'inkwell-devtools-root';
      el.style.position = 'fixed';
      el.style.zIndex = '2147483646';
      el.style.top = '0';
      el.style.left = '0';
      document.body.appendChild(el);
      this.container = el;
    }
    this.root = createRoot(this.container);
    this.root.render(<DevToolsPanel {...(this.props ?? {})} />);
  }
}

/**
 * DevTools（对外 React 组件入口）
 * 用法：在任意位置渲染 <DevTools/>，内部将通过单例管理类挂载全局唯一面板。
 * 注意：组件自身不再直接渲染面板，而是触发单例的创建与挂载。
 */
export function DevTools(props: DevToolsProps) {
  useEffect(() => {
    const inst = Devtools.getInstance(props);
    inst.update(props);
    return () => {
      // 保持单例生命周期，由显示的 dispose/reset 控制
    };
  }, [props]);
  return null;
}
