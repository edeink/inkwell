import { describe, expect, it, vi } from 'vitest';

import { MindMapViewport } from '../mindmap-viewport';
import { CustomComponentType } from '../type';

import type { InkwellEvent } from '@/core/events';

describe('MindMapViewport 集成测试 (Integration)', () => {
  it('应使用默认属性初始化 (should initialize with default mindmap properties)', () => {
    const vp = new MindMapViewport({ type: CustomComponentType.MindMapViewport });
    expect(vp.selectedKeys).toEqual([]);
    expect(vp.selectionRect).toBeNull();
    expect(vp.historyManager).toBeDefined();
  });

  it('应执行缩放并记录历史 (should execute zoom and record history)', () => {
    const vp = new MindMapViewport({ type: CustomComponentType.MindMapViewport });
    const initialScale = vp.scale;

    // 使用公开的 zoomIn 方法触发 executeZoom
    vp.zoomIn();
    expect(vp.scale).toBeGreaterThan(initialScale);

    // 检查历史记录
    expect(vp.historyManager.getState().canUndo).toBe(true);
  });

  it('应撤销缩放 (should undo zoom)', async () => {
    const vp = new MindMapViewport({ type: CustomComponentType.MindMapViewport });
    const initialScale = vp.scale;

    vp.zoomIn();
    const zoomedScale = vp.scale;
    expect(zoomedScale).not.toBe(initialScale);

    await vp.undo();
    // 浮点数比较可能需要 closeTo，但这里应该是精确还原，因为历史记录存储的是状态快照
    expect(vp.scale).toBe(initialScale);
  });

  it('应重做缩放 (should redo zoom)', async () => {
    const vp = new MindMapViewport({ type: CustomComponentType.MindMapViewport });
    const initialScale = vp.scale;

    vp.zoomIn();
    await vp.undo();
    expect(vp.scale).toBe(initialScale);

    await vp.redo();
    expect(vp.scale).not.toBe(initialScale);
  });

  it('应处理快捷键撤销 (should handle shortcuts - Undo)', async () => {
    const vp = new MindMapViewport({ type: CustomComponentType.MindMapViewport });
    vp.zoomIn();
    expect(vp.historyManager.getState().canUndo).toBe(true);

    // 模拟 Ctrl+Z
    const mockEvent = {
      nativeEvent: {
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        key: 'z',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as KeyboardEvent,
      stopPropagation: vi.fn(),
    } as unknown as InkwellEvent;

    // onKeyDown 调用 shortcutManager
    vp.onKeyDown(mockEvent);

    // 等待异步操作完成
    await new Promise((r) => setTimeout(r, 10));

    expect(vp.scale).toBe(1);
  });

  it('应当正确框选节点 (should collect keys in rect)', () => {
    const vp = new MindMapViewport({ type: CustomComponentType.MindMapViewport });

    // Create mock children
    const child1 = {
      type: CustomComponentType.MindMapNode,
      key: 'node-1',
      parent: vp,
      children: [],
      renderObject: {
        offset: { dx: 10, dy: 10 },
        size: { width: 50, height: 50 },
      },
    } as any;

    const child2 = {
      type: CustomComponentType.MindMapNode,
      key: 'node-2',
      parent: vp,
      children: [],
      renderObject: {
        offset: { dx: 100, dy: 100 },
        size: { width: 50, height: 50 },
      },
    } as any;

    vp.children = [child1, child2];

    // Simulate selection rect that covers child1 but not child2
    const selected = (vp as any).collectKeysInRect({ x: 0, y: 0, width: 80, height: 80 });
    expect(selected).toContain('node-1');
    expect(selected).not.toContain('node-2');

    const selected2 = (vp as any).collectKeysInRect({ x: 0, y: 0, width: 200, height: 200 });
    expect(selected2).toContain('node-1');
    expect(selected2).toContain('node-2');
  });

  it('应支持 zoomAt 方法 (should support zoomAt)', () => {
    const vp = new MindMapViewport({ type: CustomComponentType.MindMapViewport });
    // Viewport now has public zoomAt
    vp.zoomAt(2, 100, 100);
    expect(vp.scale).toBe(2);

    // 验证历史记录也被记录（MindMapViewport override executeZoom）
    expect(vp.historyManager.getState().canUndo).toBe(true);
  });
});
