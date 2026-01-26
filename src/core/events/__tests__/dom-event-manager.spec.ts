import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Widget } from '../../base';
import { WidgetRegistry } from '../../registry';
import { DOMEventManager } from '../dom-event-manager';
import { EventRegistry } from '../registry';

// 模拟 Widget
class TestWidget extends Widget {
  constructor(props: any) {
    super({ ...props, type: 'TestWidget' });
  }
}

// 模拟复合 Widget
class CompositeWidget extends Widget {
  constructor(props: any) {
    super({ ...props, type: 'CompositeWidget' });
  }
}

describe('DOM 事件管理器', () => {
  let mockRuntime: any;

  beforeEach(() => {
    mockRuntime = {}; // 模拟 runtime 对象
    EventRegistry.clearAll();
    // 模拟 isCompositeType
    vi.spyOn(WidgetRegistry, 'isCompositeType').mockImplementation((type) => {
      return type === 'CompositeWidget';
    });
  });

  it('应该注册 click 事件', () => {
    const handler = vi.fn();
    const widget = new TestWidget({ key: 'w1' });
    (widget as any)._runtime = mockRuntime; // 注入 runtime

    DOMEventManager.bindEvents(widget, {
      onClick: handler,
    });

    const handlers = EventRegistry.getHandlers(String(widget.eventKey), 'click', mockRuntime);
    expect(handlers).toHaveLength(1);
    expect(handlers[0].handler).toBe(handler);
    expect(handlers[0].capture).toBe(false);
  });

  it('应该注册捕获事件', () => {
    const handler = vi.fn();
    const widget = new TestWidget({ key: 'w1' });
    (widget as any)._runtime = mockRuntime;

    DOMEventManager.bindEvents(widget, {
      onClickCapture: handler,
    });

    const handlers = EventRegistry.getHandlers(String(widget.eventKey), 'click', mockRuntime);
    expect(handlers).toHaveLength(1);
    expect(handlers[0].capture).toBe(true);
  });

  it('应该注册 dblclick 事件', () => {
    const handler = vi.fn();
    const widget = new TestWidget({ key: 'w1' });
    (widget as any)._runtime = mockRuntime;

    DOMEventManager.bindEvents(widget, {
      onDoubleClick: handler,
    });

    const handlers = EventRegistry.getHandlers(String(widget.eventKey), 'dblclick', mockRuntime);
    expect(handlers).toHaveLength(1);
  });

  it('应该注册 mouseenter 事件', () => {
    const handler = vi.fn();
    const widget = new TestWidget({ key: 'w1' });
    (widget as any)._runtime = mockRuntime;

    DOMEventManager.bindEvents(widget, {
      onMouseEnter: handler,
    });

    const handlers = EventRegistry.getHandlers(String(widget.eventKey), 'mouseenter', mockRuntime);
    expect(handlers).toHaveLength(1);
  });

  it('不应跳过复合 widget', () => {
    const handler = vi.fn();
    const widget = new CompositeWidget({ key: 'comp1' });
    (widget as any)._runtime = mockRuntime;

    // 验证它是复合组件
    expect(WidgetRegistry.isCompositeType('CompositeWidget')).toBe(true);

    DOMEventManager.bindEvents(widget, {
      onClick: handler,
    });

    const handlers = EventRegistry.getHandlers(String(widget.eventKey), 'click', mockRuntime);
    expect(handlers).toHaveLength(1);
  });

  it('注册新事件前应该清除现有事件', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const widget = new TestWidget({ key: 'w1' });
    (widget as any)._runtime = mockRuntime;

    // 第一次绑定
    DOMEventManager.bindEvents(widget, {
      onClick: handler1,
    });

    let handlers = EventRegistry.getHandlers(String(widget.eventKey), 'click', mockRuntime);
    expect(handlers[0].handler).toBe(handler1);

    // 第二次绑定 (更新)
    DOMEventManager.bindEvents(widget, {
      onClick: handler2,
    });

    handlers = EventRegistry.getHandlers(String(widget.eventKey), 'click', mockRuntime);
    expect(handlers).toHaveLength(1);
    expect(handlers[0].handler).toBe(handler2);
  });

  it('如果属性没有事件应该清除事件', () => {
    const handler = vi.fn();
    const widget = new TestWidget({ key: 'w1' });
    (widget as any)._runtime = mockRuntime;

    DOMEventManager.bindEvents(widget, {
      onClick: handler,
    });

    // 绑定空事件
    DOMEventManager.bindEvents(widget, {});

    const handlers = EventRegistry.getHandlers(String(widget.eventKey), 'click', mockRuntime);
    expect(handlers).toHaveLength(0);
  });

  it('销毁组件时应清理事件，避免 key 复用后残留', () => {
    const handler = vi.fn();
    const widget = new TestWidget({ key: 'w1' });
    (widget as any)._runtime = mockRuntime;

    DOMEventManager.bindEvents(widget, {
      onClick: handler,
    });

    const ek = String(widget.eventKey);
    expect(EventRegistry.getHandlers(ek, 'click', mockRuntime)).toHaveLength(1);

    widget.dispose();

    expect(EventRegistry.getHandlers(ek, 'click', mockRuntime)).toHaveLength(0);

    const reusedKeyWidget = new TestWidget({ key: 'w1' });
    (reusedKeyWidget as any)._runtime = mockRuntime;
    DOMEventManager.bindEvents(reusedKeyWidget, {});

    expect(EventRegistry.getHandlers(ek, 'click', mockRuntime)).toHaveLength(0);
  });
});
