import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MindMapViewport } from '../mindmap-viewport';
import { CustomComponentType } from '../type';
// import { Runtime } from '@/core/runtime'; // Not used in this test actually, removing

describe('MindMapViewport Pinch & History', () => {
  let vp: MindMapViewport;

  beforeEach(async () => {
    // Setup Viewport
    vp = new MindMapViewport({
      type: CustomComponentType.MindMapViewport,
      width: 800,
      height: 600,
      scale: 1,
      minScale: 0.1, // Explicitly set constraints for test
      maxScale: 10,
    });

    // Mock HistoryManager
    vp.historyManager = {
      execute: vi.fn((cmd) => {
        // Execute command logic directly
        cmd.execute();
      }),
      undo: vi.fn(),
      redo: vi.fn(),
    } as any;
  });

  it('双指捏合应触发缩放但不记录历史 (Pinch should zoom without history)', () => {
    // 1. First Finger Down
    vp.onPointerDown({
      nativeEvent: { pointerId: 1, clientX: 100, clientY: 100, buttons: 1 } as PointerEvent,
      x: 100,
      y: 100, // World XY (assuming initial scale 1, tx 0)
    } as any);

    // 2. Second Finger Down
    vp.onPointerDown({
      nativeEvent: { pointerId: 2, clientX: 300, clientY: 100, buttons: 1 } as PointerEvent,
      x: 300,
      y: 100,
    } as any);

    // Check pinch state initialized
    // Access private pinchState via any
    const state = (vp as any).pinchState;
    expect(state).toBeTruthy();
    expect(state.startD).toBe(200); // 300 - 100

    // 3. Move Second Finger (Expand)
    vp.onPointerMove({
      nativeEvent: { pointerId: 2, clientX: 400, clientY: 100, buttons: 1 } as PointerEvent,
      x: 400,
      y: 100,
    } as any);

    // Distance changed from 200 to 300. Scale should increase.
    // New Scale = 1 * (300 / 200) = 1.5
    expect(vp.scale).toBeCloseTo(1.5);

    // Check History - Should NOT be called
    expect(vp.historyManager.execute).not.toHaveBeenCalled();

    // 4. Pointer Up
    vp.onPointerUp({
      nativeEvent: { pointerId: 1 } as PointerEvent,
    } as any);

    expect((vp as any).pinchState).toBeNull();
  });

  it('滚轮缩放不应记录历史 (Wheel zoom should not record history)', () => {
    // Wheel Event
    vp.onWheel({
      nativeEvent: {
        deltaY: -100, // Zoom in
        ctrlKey: true, // Enable Zoom Mode
        clientX: 400,
        clientY: 300,
        preventDefault: () => {},
      } as unknown as WheelEvent,
      x: 400,
      y: 300,
    } as any);

    expect(vp.scale).toBeGreaterThan(1);
    expect(vp.historyManager.execute).not.toHaveBeenCalled();
  });

  it('Explicit zoomAt should record history (if using default)', () => {
    // Using zoomAt directly (public API) usually goes through executeZoom with default true
    // Unless we changed zoomAt implementation?
    // MindMapViewport doesn't override zoomAt, it inherits from Viewport.
    // Viewport.zoomAt calls this.executeZoom.
    // Since we overrode executeZoom with default true, it should record.

    vp.zoomAt(2.0, 400, 300);
    expect(vp.scale).toBe(2.0);
    expect(vp.historyManager.execute).toHaveBeenCalled();
  });
});
