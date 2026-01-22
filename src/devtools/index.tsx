import { useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { DevToolsPanel, type DevToolsProps } from './components/devtools-panel';

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
