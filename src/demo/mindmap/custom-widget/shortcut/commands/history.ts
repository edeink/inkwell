import type { ShortcutCommand, ShortcutContext } from '../types';

/**
 * 撤销命令
 * 快捷键: Ctrl+Z / Meta+Z
 */
export const UndoCommand: ShortcutCommand = {
  id: 'undo',
  keys: ['Ctrl+z', 'Meta+z'],
  priority: 100,
  execute: ({ viewport }: ShortcutContext) => {
    viewport.undo();
    return true;
  },
};

/**
 * 重做命令
 * 快捷键: Ctrl+Y / Meta+Y / Ctrl+Shift+Z / Meta+Shift+Z
 */
export const RedoCommand: ShortcutCommand = {
  id: 'redo',
  keys: ['Ctrl+y', 'Meta+y', 'Ctrl+Shift+z', 'Meta+Shift+z'],
  priority: 100,
  execute: ({ viewport }: ShortcutContext) => {
    viewport.redo();
    return true;
  },
};

/**
 * 删除选中命令
 * 快捷键: Delete / Backspace
 */
export const DeleteCommand: ShortcutCommand = {
  id: 'delete',
  keys: ['Delete', 'Backspace'],
  priority: 100,
  execute: ({ viewport }: ShortcutContext) => {
    if (viewport.editingKey) {
      // 正在编辑时不触发删除
      return false;
    }
    viewport.deleteSelection();
    return true;
  },
};
