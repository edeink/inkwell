import { describe, expect, it, vi } from 'vitest';

import { MindMapViewport } from '../../mindmap-viewport';
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

describe('Viewport Zoom & Undo/Redo', () => {
  it('Zoom 操作应记录到历史栈并支持撤销重做', async () => {
    // Mock Viewport
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
      historyManager: new HistoryManager(),
      zoomIn: MindMapViewport.prototype.zoomIn,
      zoomOut: MindMapViewport.prototype.zoomOut,
      resetZoom: MindMapViewport.prototype.resetZoom,
      executeZoom: (MindMapViewport.prototype as any).executeZoom,
      _contentTx: 0,
      _contentTy: 0,
    } as any;

    // Bind methods to mock instance
    viewport.zoomIn = viewport.zoomIn.bind(viewport);
    viewport.zoomOut = viewport.zoomOut.bind(viewport);
    viewport.resetZoom = viewport.resetZoom.bind(viewport);
    viewport.executeZoom = viewport.executeZoom.bind(viewport);

    // Initial state
    expect(viewport.scale).toBe(1);

    // Zoom In
    viewport.zoomIn();
    expect(viewport.scale).toBeGreaterThan(1);
    const scaleAfterZoomIn = viewport.scale;
    expect(viewport.historyManager.getUndoStack()).toHaveLength(1);

    // Zoom Out
    viewport.zoomOut();
    expect(viewport.scale).toBeLessThan(scaleAfterZoomIn);
    expect(viewport.historyManager.getUndoStack()).toHaveLength(2);

    // Undo Zoom Out
    await viewport.historyManager.undo();
    expect(viewport.scale).toBe(scaleAfterZoomIn);

    // Undo Zoom In
    await viewport.historyManager.undo();
    expect(viewport.scale).toBe(1);

    // Redo Zoom In
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

    // Test Ctrl+= (Zoom In)
    PreventBrowserZoomCommand.execute(context);
    expect(nativeEvent.preventDefault).toHaveBeenCalled();
    expect(viewport.zoomIn).toHaveBeenCalled();

    // Test Ctrl+- (Zoom Out)
    nativeEvent.key = '-';
    PreventBrowserZoomCommand.execute(context);
    expect(viewport.zoomOut).toHaveBeenCalled();

    // Test Ctrl+0 (Reset)
    nativeEvent.key = '0';
    PreventBrowserZoomCommand.execute(context);
    expect(viewport.resetZoom).toHaveBeenCalled();
  });
});
