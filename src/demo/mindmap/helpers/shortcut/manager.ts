import type { ShortcutCommand, ShortcutContext, ShortcutRegistry } from './types';

/**
 * 快捷键管理器
 * 负责管理和分发快捷键事件
 */
export class ShortcutManager implements ShortcutRegistry {
  private commands: ShortcutCommand[] = [];

  /**
   * 注册快捷键命令
   * @param command 命令对象
   */
  register(command: ShortcutCommand): void {
    // 移除同名命令（如果存在）
    this.unregister(command.id);
    this.commands.push(command);
    // 按优先级降序排序
    this.commands.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * 注销快捷键命令
   * @param id 命令ID
   */
  unregister(id: string): void {
    this.commands = this.commands.filter((c) => c.id !== id);
  }

  /**
   * 处理键盘事件
   * @param context 快捷键上下文
   * @returns 是否已处理
   */
  handle(context: ShortcutContext): boolean {
    const { nativeEvent } = context;
    if (!nativeEvent) {
      return false;
    }

    for (const command of this.commands) {
      if (this.isMatch(nativeEvent, command.keys)) {
        const handled = command.execute(context);
        if (handled === true) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 检查事件是否匹配按键组合
   */
  private isMatch(e: KeyboardEvent, keys: string[]): boolean {
    for (const keyCombo of keys) {
      if (this.checkCombo(e, keyCombo)) {
        return true;
      }
    }
    return false;
  }

  private checkCombo(e: KeyboardEvent, combo: string): boolean {
    const parts = combo.split('+').map((p) => p.trim().toLowerCase());

    // 检查修饰键
    const ctrl = parts.includes('ctrl');
    const meta = parts.includes('meta') || parts.includes('cmd') || parts.includes('command');
    const shift = parts.includes('shift');
    const alt = parts.includes('alt'); // Option

    if (e.ctrlKey !== ctrl) {
      return false;
    }
    if (e.metaKey !== meta) {
      return false;
    }
    if (e.shiftKey !== shift) {
      return false;
    }
    if (e.altKey !== alt) {
      return false;
    }

    // 检查主键
    // 过滤掉修饰键，剩下的就是主键
    const mainKeys = parts.filter(
      (p) => !['ctrl', 'meta', 'cmd', 'command', 'shift', 'alt'].includes(p),
    );

    if (mainKeys.length !== 1) {
      // 如果没有主键（例如只按了 Ctrl），通常不作为快捷键触发，或者这里逻辑需要调整
      // 现假设必须有一个主键
      return false;
    }

    const mainKey = mainKeys[0];

    // 处理特殊键映射
    const eventKey = e.key.toLowerCase();

    if (mainKey === eventKey) {
      return true;
    }

    // 处理一些特殊情况
    // 如 'delete' vs 'del'
    // 'escape' vs 'esc'
    // '+' vs '=' (on some layouts) -> 实际上 e.key 会是 '+' 或 '='

    return mainKey === eventKey;
  }
}
