import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeleteCommand, RedoCommand, UndoCommand } from '../commands/history';
import {
  MoveDownCommand,
  MoveLeftCommand,
  MoveRightCommand,
  MoveUpCommand,
} from '../commands/navigation';
import { PreventBrowserZoomCommand } from '../commands/system';
import { ShortcutManager } from '../manager';

describe('ShortcutSystem', () => {
  let manager: ShortcutManager;
  let viewportMock: any;

  beforeEach(() => {
    manager = new ShortcutManager();
    viewportMock = {
      undo: vi.fn(),
      redo: vi.fn(),
      deleteSelection: vi.fn(),
      get editingKey() {
        return this._editingKey;
      },
      _editingKey: null,
      scale: 1,
      scrollBy: vi.fn(),
      scrollTo: vi.fn(),
      historyManager: {
        execute: vi.fn((cmd) => cmd.execute()),
      },
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      resetZoom: vi.fn(),
    };
  });

  function createEvent(
    key: string,
    modifiers: { ctrl?: boolean; shift?: boolean; meta?: boolean; alt?: boolean } = {},
  ) {
    return {
      key,
      ctrlKey: !!modifiers.ctrl,
      shiftKey: !!modifiers.shift,
      metaKey: !!modifiers.meta,
      altKey: !!modifiers.alt,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;
  }

  function handle(event: KeyboardEvent) {
    return manager.handle({
      viewport: viewportMock,
      event: {} as any,
      nativeEvent: event,
    });
  }

  it('应当正确触发撤销命令 (Ctrl+Z)', () => {
    manager.register(UndoCommand);
    const event = createEvent('z', { ctrl: true });
    expect(handle(event)).toBe(true);
    expect(viewportMock.undo).toHaveBeenCalled();
  });

  it('应当正确触发重做命令 (Ctrl+Y)', () => {
    manager.register(RedoCommand);
    const event = createEvent('y', { ctrl: true });
    expect(handle(event)).toBe(true);
    expect(viewportMock.redo).toHaveBeenCalled();
  });

  it('应当正确触发重做命令 (Ctrl+Shift+Z)', () => {
    manager.register(RedoCommand);
    const event = createEvent('z', { ctrl: true, shift: true });
    expect(handle(event)).toBe(true);
    expect(viewportMock.redo).toHaveBeenCalled();
  });

  it('应当正确触发删除命令 (Delete)', () => {
    manager.register(DeleteCommand);
    const event = createEvent('Delete');
    expect(handle(event)).toBe(true);
    expect(viewportMock.deleteSelection).toHaveBeenCalled();
  });

  it('编辑状态下不应触发删除命令', () => {
    manager.register(DeleteCommand);
    viewportMock._editingKey = 'node-1';
    const event = createEvent('Delete');
    expect(handle(event)).toBe(false);
    expect(viewportMock.deleteSelection).not.toHaveBeenCalled();
  });

  it('应当正确触发导航命令 (Arrow Keys)', () => {
    manager.register(MoveLeftCommand);
    manager.register(MoveRightCommand);
    manager.register(MoveUpCommand);
    manager.register(MoveDownCommand);

    // Left
    handle(createEvent('ArrowLeft'));
    expect(viewportMock.scrollBy).toHaveBeenCalledWith(-20, 0);

    // Right
    handle(createEvent('ArrowRight'));
    expect(viewportMock.scrollBy).toHaveBeenCalledWith(20, 0);

    // Up
    handle(createEvent('ArrowUp'));
    expect(viewportMock.scrollBy).toHaveBeenCalledWith(0, -20);

    // Down
    handle(createEvent('ArrowDown'));
    expect(viewportMock.scrollBy).toHaveBeenCalledWith(0, 20);
  });

  it('应当阻止浏览器默认缩放行为', () => {
    manager.register(PreventBrowserZoomCommand);
    const event = createEvent('=', { ctrl: true });
    expect(handle(event)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('应当支持优先级处理', () => {
    const lowPriorityCmd = {
      id: 'low',
      keys: ['a'],
      priority: 0,
      execute: vi.fn().mockReturnValue(true),
    };
    const highPriorityCmd = {
      id: 'high',
      keys: ['a'],
      priority: 100,
      execute: vi.fn().mockReturnValue(true),
    };

    manager.register(lowPriorityCmd);
    manager.register(highPriorityCmd);

    handle(createEvent('a'));

    expect(highPriorityCmd.execute).toHaveBeenCalled();
    expect(lowPriorityCmd.execute).not.toHaveBeenCalled();
  });

  it('应当支持动态注册和注销命令', () => {
    const cmd = {
      id: 'test',
      keys: ['a'],
      execute: vi.fn().mockReturnValue(true),
    };

    manager.register(cmd);
    expect(handle(createEvent('a'))).toBe(true);

    manager.unregister('test');
    expect(handle(createEvent('a'))).toBe(false);
  });
});
