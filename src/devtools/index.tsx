import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { DevToolsPanel, type DevToolsProps } from './components/devtools-panel';
import { useDevtoolsHotkeys } from './hooks/useDevtoolsHotkeys';

type BootstrapDetail = { __inkwellDevtoolsBootstrap?: boolean };
type BootstrapEvent = CustomEvent<BootstrapDetail>;

function isBootstrapEvent(ev: Event): ev is BootstrapEvent {
  return ev instanceof CustomEvent && !!ev.detail?.__inkwellDevtoolsBootstrap;
}

type DevtoolsGlobalState = {
  instance: Devtools | null;
  initializing: Promise<Devtools> | null;
};

const DEVTOOLS_GLOBAL_KEY = '__INKWELL_DEVTOOLS_SINGLETON__';
const DEVTOOLS_MOUNT_FAIL_KEY = 'INKWELL_DEVTOOLS_MOUNT_FAIL';

function getGlobalState(): DevtoolsGlobalState {
  const g = globalThis as unknown as Record<string, DevtoolsGlobalState | undefined>;
  if (!g[DEVTOOLS_GLOBAL_KEY]) {
    g[DEVTOOLS_GLOBAL_KEY] = { instance: null, initializing: null };
  }
  return g[DEVTOOLS_GLOBAL_KEY]!;
}

function isSameShortcut(a: DevToolsProps['shortcut'], b: DevToolsProps['shortcut']): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  if (typeof a === 'string' || typeof b === 'string') {
    return a === b;
  }
  return a.combo === b.combo && a.action === b.action;
}

function isSameProps(a: DevToolsProps | undefined, b: DevToolsProps | undefined): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.onClose === b.onClose && isSameShortcut(a.shortcut, b.shortcut);
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
 * Devtools（单例管理类）
 * 目标：在整个应用范围内确保仅存在一个 DevTools 面板实例。
 * - 使用双重检查锁定（DCL）保证并发初始化安全。
 * - 提供 dispose/reset 生命周期管理以适配测试环境。
 */
export class Devtools implements IDevtools {
  // 宿主容器与 React Root
  private container: HTMLDivElement | null = null;
  private root: Root | null = null;
  private disposed = false;
  private mounting = false;
  private props: DevToolsProps | undefined;
  private renderedProps: DevToolsProps | undefined;

  // 私有构造以防外部实例化
  private constructor(props?: DevToolsProps) {
    this.props = props;
  }

  /**
   * 同步获取实例（快速路径）：
   * - 若已存在实例，直接返回；
   * - 否则创建并返回新实例。
   */
  static getInstance(props?: DevToolsProps): Devtools {
    const g = getGlobalState();
    const inst = g.instance;
    if (inst && !inst.disposed) {
      return inst;
    }
    // 创建新实例（JS 单线程环境下无需锁）。
    const created = new Devtools(props);
    g.instance = created;
    return created;
  }

  /**
   * 并发安全获取实例（异步）：
   * - 使用 DCL + 初始化 Promise，避免竞争条件。
   */
  static async getInstanceAsync(props?: DevToolsProps): Promise<Devtools> {
    const g = getGlobalState();
    const inst = g.instance;
    if (inst && !inst.disposed) {
      return inst;
    }
    if (!g.initializing) {
      g.initializing = (async () => {
        // 第二次检查，避免重复创建
        if (g.instance && !g.instance.disposed) {
          return g.instance;
        }
        const created = new Devtools(props);
        g.instance = created;
        return created;
      })();
    }
    const result = await g.initializing;
    g.initializing = null; // 释放初始化占位，减少后续锁竞争
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
    this.emit('INKWELL_DEVTOOLS_OPEN');
  }

  /**
   * 主动隐藏面板（当前实现保持组件内部控制，此处不卸载以保留状态）
   */
  hide(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('INKWELL_DEVTOOLS_CLOSE'));
    }
  }

  emit(type: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    if (!this.isMounted()) {
      this.ensureMounted();
    }
    if (!this.isMounted()) {
      return;
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(type, { detail: { __inkwellDevtoolsBootstrap: true } }));
    }, 0);
  }

  /**
   * 销毁实例并移除挂载容器
   */
  dispose(): void {
    if (this.root) {
      try {
        this.root.unmount();
      } catch (err) {
        console.error('[DevTools] 卸载失败:', err);
      }
      this.root = null;
    }
    if (this.container) {
      try {
        this.container.remove();
      } catch (err) {
        console.error('[DevTools] 移除容器失败:', err);
      }
      this.container = null;
    }
    this.disposed = true;
    const g = getGlobalState();
    if (g.instance === this) {
      g.instance = null;
      g.initializing = null;
    }
    this.renderedProps = undefined;
  }

  /**
   * 重置（测试辅助）：等价于 dispose，但确保静态状态清空
   */
  static reset(): void {
    const g = getGlobalState();
    if (g.instance) {
      g.instance.dispose();
    }
    g.instance = null;
    g.initializing = null;
  }

  /**
   * 重新渲染以应用新的 props
   */
  update(props?: DevToolsProps): void {
    this.props = props ?? this.props;
    const next = this.props;
    if (isSameProps(this.renderedProps, next)) {
      return;
    }
    if (this.root && this.container) {
      this.root.render(<DevToolsPanel {...(this.props ?? {})} />);
      this.renderedProps = next;
    }
  }

  private ensureMounted(): void {
    if (this.disposed) {
      this.disposed = false;
    }
    if (this.mounting) {
      return;
    }
    if (this.isMounted()) {
      return;
    }
    try {
      if (localStorage.getItem(DEVTOOLS_MOUNT_FAIL_KEY)) {
        return;
      }
    } catch {
      void 0;
    }
    this.mounting = true;
    try {
      this.mount();
      try {
        localStorage.removeItem(DEVTOOLS_MOUNT_FAIL_KEY);
      } catch {
        void 0;
      }
    } catch (err) {
      try {
        localStorage.setItem(DEVTOOLS_MOUNT_FAIL_KEY, String(Date.now()));
      } catch {
        void 0;
      }
      console.error('[DevTools] 挂载失败:', err);
      this.root = null;
      this.container = null;
    } finally {
      this.mounting = false;
    }
  }

  /**
   * 创建并挂载全局容器到 document.body，并渲染面板
   */
  private mount(): void {
    if (this.root && this.container) {
      return;
    }
    const existing = document.getElementById('inkwell-devtools-root');
    this.container = existing as HTMLDivElement | null;
    if (!this.container) {
      const el = document.createElement('div');
      el.id = 'inkwell-devtools-root';
      document.body.appendChild(el);
      this.container = el;
    }
    this.root = createRoot(this.container);
    const next = this.props ?? {};
    this.root.render(<DevToolsPanel {...next} />);
    this.renderedProps = next;
  }
}

/**
 * DevTools（对外 React 组件入口）
 * 用法：在任意位置渲染 <DevTools/>，内部将通过单例管理类挂载全局唯一面板。
 * 注意：组件自身不再直接渲染面板，而是触发单例的创建与挂载。
 */
export function DevTools(props: DevToolsProps) {
  const propsRef = useRef(props);
  propsRef.current = props;

  const combo =
    typeof props.shortcut === 'string'
      ? props.shortcut
      : typeof props.shortcut === 'object'
        ? props.shortcut?.combo
        : undefined;
  const action =
    typeof props.shortcut === 'object' && props.shortcut?.action ? props.shortcut.action : 'toggle';

  useDevtoolsHotkeys({
    combo,
    action,
    enabled: true,
    onToggle: () => {
      Devtools.getInstance(propsRef.current).emit('INKWELL_DEVTOOLS_TOGGLE');
    },
    onClose: () => {
      Devtools.getInstance(propsRef.current).hide();
      propsRef.current.onClose?.();
    },
    onInspectToggle: () => {
      Devtools.getInstance(propsRef.current).emit('INKWELL_DEVTOOLS_INSPECT_TOGGLE');
    },
  });

  useEffect(() => {
    const inst = Devtools.getInstance(props);
    inst.update(props);

    const onOpen = (ev: Event) => {
      if (isBootstrapEvent(ev)) {
        return;
      }
      if (!inst.isMounted()) {
        inst.emit('INKWELL_DEVTOOLS_OPEN');
      }
    };
    const onToggle = (ev: Event) => {
      if (isBootstrapEvent(ev)) {
        return;
      }
      if (!inst.isMounted()) {
        inst.emit('INKWELL_DEVTOOLS_TOGGLE');
      }
    };
    const onInspectToggle = (ev: Event) => {
      if (isBootstrapEvent(ev)) {
        return;
      }
      if (!inst.isMounted()) {
        inst.emit('INKWELL_DEVTOOLS_INSPECT_TOGGLE');
      }
    };

    window.addEventListener('INKWELL_DEVTOOLS_OPEN', onOpen);
    window.addEventListener('INKWELL_DEVTOOLS_TOGGLE', onToggle);
    window.addEventListener('INKWELL_DEVTOOLS_INSPECT_TOGGLE', onInspectToggle);
    return () => {
      // 保持单例生命周期，由显示的 dispose/reset 控制
      window.removeEventListener('INKWELL_DEVTOOLS_OPEN', onOpen);
      window.removeEventListener('INKWELL_DEVTOOLS_TOGGLE', onToggle);
      window.removeEventListener('INKWELL_DEVTOOLS_INSPECT_TOGGLE', onInspectToggle);
    };
  }, [props.onClose, props.shortcut]);
  return null;
}
