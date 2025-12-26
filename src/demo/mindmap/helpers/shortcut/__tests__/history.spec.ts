import { describe, expect, it, vi } from 'vitest';

import { MindMapViewport } from '../../../widgets/mindmap-viewport';
import { PreventBrowserZoomCommand } from '../commands/system';
import { HistoryManager } from '../history/manager';

describe('HistoryManager', () => {
  it('应正确管理撤销/重做栈', async () => {
    const history = new HistoryManager();
    const cmd = {
      execute: vi.fn(),
      undo: vi.fn(),
    };

    await history.execute(cmd);
    expect(history.getUndoStack()).toHaveLength(1);
    expect(history.getRedoStack()).toHaveLength(0);

    await history.undo();
    expect(cmd.undo).toHaveBeenCalled();
    expect(history.getUndoStack()).toHaveLength(0);
    expect(history.getRedoStack()).toHaveLength(1);

    await history.redo();
    expect(cmd.execute).toHaveBeenCalledTimes(2); // Initial + Redo
    expect(history.getUndoStack()).toHaveLength(1);
    expect(history.getRedoStack()).toHaveLength(0);
  });

  it('应限制历史记录数量', async () => {
    const history = new HistoryManager(2);
    const cmd = { execute: vi.fn(), undo: vi.fn() };

    await history.execute(cmd);
    await history.execute(cmd);
    await history.execute(cmd);

    expect(history.getUndoStack()).toHaveLength(2);
  });

  it('推入新命令应清空重做栈', async () => {
    const history = new HistoryManager();
    const cmd = { execute: vi.fn(), undo: vi.fn() };

    await history.execute(cmd);
    await history.undo();
    expect(history.getRedoStack()).toHaveLength(1);

    await history.execute(cmd);
    expect(history.getRedoStack()).toHaveLength(0);
  });
});

describe('视口缩放与撤销/重做', () => {
  it('Zoom 操作应记录到历史栈并支持撤销重做', async () => {
    // 模拟 Viewport
    const viewport = {
      scale: 1,
      tx: 0,
      ty: 0,
      width: 1000,
      height: 800,
      setTransform: vi.fn(function (this: any, s, x, y) {
        this.scale = s;
        this.tx = x;
        this.ty = y;
      }),
      // 添加 clampScale 方法以修复 TypeError
      clampScale: (s: number) => s,
      historyManager: new HistoryManager(),
      zoomIn: MindMapViewport.prototype.zoomIn,
      zoomOut: MindMapViewport.prototype.zoomOut,
      resetZoom: MindMapViewport.prototype.resetZoom,
      executeZoom: (MindMapViewport.prototype as any).executeZoom,
      _scrollX: 0,
      _scrollY: 0,
    } as any;

    // 绑定方法到模拟实例
    viewport.zoomIn = viewport.zoomIn.bind(viewport);
    viewport.zoomOut = viewport.zoomOut.bind(viewport);
    viewport.resetZoom = viewport.resetZoom.bind(viewport);
    viewport.executeZoom = viewport.executeZoom.bind(viewport);

    // 初始状态
    expect(viewport.scale).toBe(1);

    // 放大
    viewport.zoomIn();
    expect(viewport.scale).toBeGreaterThan(1);
    const scaleAfterZoomIn = viewport.scale;
    expect(viewport.historyManager.getUndoStack()).toHaveLength(1);

    // 缩小
    viewport.zoomOut();
    expect(viewport.scale).toBeLessThan(scaleAfterZoomIn);
    expect(viewport.historyManager.getUndoStack()).toHaveLength(2);

    // 撤销缩小
    await viewport.historyManager.undo();
    expect(viewport.scale).toBe(scaleAfterZoomIn);

    // 撤销放大
    await viewport.historyManager.undo();
    expect(viewport.scale).toBe(1);

    // 重做放大
    await viewport.historyManager.redo();
    expect(viewport.scale).toBe(scaleAfterZoomIn);
  });
});

describe('PreventBrowserZoomCommand', () => {
  it('应阻止默认行为并调用 Viewport 缩放', () => {
    const viewport = {
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      resetZoom: vi.fn(),
    } as any;

    const nativeEvent = {
      preventDefault: vi.fn(),
      key: '=',
      ctrlKey: true,
    } as any;

    const context = {
      viewport,
      nativeEvent,
      event: {} as any,
    };

    // 测试 Ctrl+= (放大)
    PreventBrowserZoomCommand.execute(context);
    expect(nativeEvent.preventDefault).toHaveBeenCalled();
    expect(viewport.zoomIn).toHaveBeenCalled();

    // 测试 Ctrl+- (缩小)
    nativeEvent.key = '-';
    PreventBrowserZoomCommand.execute(context);
    expect(viewport.zoomOut).toHaveBeenCalled();

    // 测试 Ctrl+0 (重置)
    nativeEvent.key = '0';
    PreventBrowserZoomCommand.execute(context);
    expect(viewport.resetZoom).toHaveBeenCalled();
  });
});
