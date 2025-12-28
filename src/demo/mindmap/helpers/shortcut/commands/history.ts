import { DeleteNodeCommand } from './edit';

import type { ShortcutCommand, ShortcutContext } from '../types';

/**
 * 撤销命令
 * 快捷键: Ctrl+Z / Meta+Z
 */
export const UndoCommand: ShortcutCommand = {
  id: 'undo',
  keys: ['Ctrl+z', 'Meta+z'],
  priority: 100,
  allowRepeat: false,
  cooldownMs: 150,
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
  allowRepeat: false,
  cooldownMs: 150,
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
  allowRepeat: false,
  cooldownMs: 150,
  execute: ({ viewport }: ShortcutContext) => {
    if (viewport.editingKey) {
      try {
        console.log('【排查步骤3】删除命令被阻止：当前处于编辑态', {
          编辑节点: viewport.editingKey,
        });
      } catch {}
      return false;
    }
    try {
      console.log('【排查步骤3】删除命令执行：准备删除选区', {
        选中数量: (viewport.selectedKeys || []).length,
      });
    } catch {}
    const cmd = new DeleteNodeCommand(viewport);
    viewport.historyManager.execute(cmd);
    try {
      console.log('【排查步骤3】删除命令已提交到历史', {
        可撤销: viewport.historyManager.getState().canUndo,
      });
    } catch {}
    return true;
  },
};
