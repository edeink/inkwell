import type { MindMapViewport } from '../mindmap-viewport';
import type { InkwellEvent } from '@/core/events';

/**
 * 快捷键上下文
 */
export interface ShortcutContext {
  /** 视口实例 */
  viewport: MindMapViewport;
  /** Inkwell 事件 */
  event: InkwellEvent;
  /** 原生键盘事件 */
  nativeEvent: KeyboardEvent;
}

/**
 * 快捷键命令接口
 */
export interface ShortcutCommand {
  /** 唯一标识符 */
  id: string;
  /**
   * 触发键组合列表
   * 格式示例：['Ctrl+Z', 'Meta+Z', 'Delete']
   * 修饰键：Ctrl, Meta (Command), Shift, Alt
   * 区分大小写
   */
  keys: string[];
  /** 优先级（数值越大优先级越高），默认 0 */
  priority?: number;
  /**
   * 执行命令
   * @param context 上下文
   * @returns 返回 true 表示已处理（停止冒泡），false 表示未处理
   */
  execute: (context: ShortcutContext) => boolean | void;
}

/**
 * 快捷键注册表接口
 */
export interface ShortcutRegistry {
  register(command: ShortcutCommand): void;
  unregister(id: string): void;
}
