import { describe, expect, it, vi } from 'vitest';

import { DeleteCommand, RedoCommand, UndoCommand } from '../commands/history';
import { MoveDownCommand } from '../commands/navigation';
import { ShortcutManager } from '../manager';

describe('快捷键边界情况', () => {
  it('撤销命令在重复按键时不应连续触发', () => {
    const manager = new ShortcutManager();
    const viewport = { undo: vi.fn() } as any;
    manager.register(UndoCommand);

    // 首次按下（非重复）
    const e1 = {
      key: 'z',
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      repeat: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;
    manager.handle({ viewport, event: {} as any, nativeEvent: e1 });
    expect(viewport.undo).toHaveBeenCalledTimes(1);

    // 长按产生的重复事件应被忽略
    const e2 = { ...e1, repeat: true } as KeyboardEvent;
    manager.handle({ viewport, event: {} as any, nativeEvent: e2 });
    expect(viewport.undo).toHaveBeenCalledTimes(1);
  });

  it('导航命令在重复按键时应持续触发', () => {
    const manager = new ShortcutManager();
    const viewport = {
      scale: 1,
      scrollBy: vi.fn(),
    } as any;
    manager.register(MoveDownCommand);

    const e = {
      key: 'ArrowDown',
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      repeat: true,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;

    manager.handle({ viewport, event: {} as any, nativeEvent: e });
    manager.handle({ viewport, event: {} as any, nativeEvent: e });
    expect(viewport.scrollBy).toHaveBeenCalledTimes(2);
  });

  it('命令冷却时间应限制过快重复触发', () => {
    const manager = new ShortcutManager();
    const viewport = { redo: vi.fn() } as any;
    manager.register(RedoCommand);

    const baseEvent = {
      key: 'y',
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      repeat: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;

    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1000);
    manager.handle({ viewport, event: {} as any, nativeEvent: baseEvent });
    expect(viewport.redo).toHaveBeenCalledTimes(1);

    // 仍在冷却期
    nowSpy.mockReturnValue(1100);
    manager.handle({ viewport, event: {} as any, nativeEvent: baseEvent });
    expect(viewport.redo).toHaveBeenCalledTimes(1);

    // 冷却已过
    nowSpy.mockReturnValue(1300 + (RedoCommand.cooldownMs ?? 0));
    manager.handle({ viewport, event: {} as any, nativeEvent: baseEvent });
    expect(viewport.redo).toHaveBeenCalledTimes(2);

    nowSpy.mockRestore();
  });

  it('优先级冲突时应按高优先级命令执行，低优先级作为兜底', () => {
    const manager = new ShortcutManager();
    const vp = {} as any;
    const high = {
      id: 'high',
      keys: ['a'],
      priority: 100,
      execute: vi.fn().mockReturnValue(false),
    };
    const low = {
      id: 'low',
      keys: ['a'],
      priority: 0,
      execute: vi.fn().mockReturnValue(true),
    };
    manager.register(high);
    manager.register(low);

    const e = {
      key: 'a',
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      repeat: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;

    const handled = manager.handle({ viewport: vp, event: {} as any, nativeEvent: e });
    expect(high.execute).toHaveBeenCalled();
    expect(low.execute).toHaveBeenCalled();
    expect(handled).toBe(true);
  });

  it('删除命令应与鼠标选区协同工作', () => {
    const manager = new ShortcutManager();
    const payload = { nodes: [{ id: 'n1' }], edges: [] };
    const viewport = {
      historyManager: { execute: vi.fn((cmd) => cmd.execute()) },
      deleteSelection: vi.fn().mockReturnValue(payload),
    } as any;
    manager.register(DeleteCommand);

    const e = {
      key: 'Delete',
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      repeat: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;

    const handled = manager.handle({ viewport, event: {} as any, nativeEvent: e });
    expect(handled).toBe(true);
    expect(viewport.deleteSelection).toHaveBeenCalled();
    expect(viewport.historyManager.execute).toHaveBeenCalled();
  });
});
