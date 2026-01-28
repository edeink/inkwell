import { describe, expect, it, vi } from 'vitest';

import { CustomComponentType } from '../../type';
import { MindMapNode } from '../mindmap-node';

import type { BoxConstraints } from '@/core/type';

import { Widget } from '@/core/base';
import { Container } from '@/core/container';
import { WidgetRegistry } from '@/core/registry';
import { Text } from '@/core/text';

// Mock Themes
vi.mock('@/styles/theme', () => ({
  getCurrentThemeMode: () => 'light',
  Themes: {
    light: {
      primary: '#1677ff',
      background: {
        container: '#fff',
      },
      state: {
        focus: '#eee',
        active: '#ddd',
        selected: '#ccc',
      },
      text: {
        primary: '#000',
        placeholder: '#999',
      },
      border: {
        base: '#ccc',
        secondary: '#eee',
      },
    },
  },
}));

describe('MindMapNode 布局更新', () => {
  // Register components
  WidgetRegistry.registerType(CustomComponentType.MindMapNode, MindMapNode);
  WidgetRegistry.registerType('Container', Container);
  WidgetRegistry.registerType('Text', Text);

  class MockTextArea extends Widget {
    constructor(props: any) {
      super({ ...props });
    }
    protected performLayout(_constraints: BoxConstraints) {
      return { width: 100, height: 20 };
    }
  }
  WidgetRegistry.registerType('TextArea', MockTextArea);

  it('场景1: 编辑状态与阅读状态切换时，节点内容应保持为文本展示', () => {
    const initialProps = {
      key: 'node-edit',
      title: 'Test Node',
      isEditing: true,
      onEdit: vi.fn(),
      // Mock getViewState for render
      getViewState: () => ({ scale: 1, tx: 0, ty: 0 }),
    };

    const node = new MindMapNode(initialProps);

    node.createElement(initialProps);

    const container = node.children[0] as Container;
    expect(container).toBeInstanceOf(Container);
    expect(container.cursor).toBe('text');
    const contentBox = container.children[0] as Container;
    expect(contentBox).toBeInstanceOf(Container);
    expect(contentBox.children[0]).toBeInstanceOf(Text);

    const newProps = { ...initialProps, isEditing: false };
    node.createElement(newProps);

    const newContainer = node.children[0] as Container;
    expect(newContainer).toBe(container); // Container should be reused
    expect(newContainer.cursor).toBe('default');
    const textBox = newContainer.children[0] as Container;
    expect(textBox.children[0]).toBeInstanceOf(Text);

    expect(newContainer.padding).toEqual({ left: 8, top: 12, right: 8, bottom: 12 });
  });

  it('场景2: 连续切换状态多次，节点内容不应渲染 TextArea', () => {
    const props = {
      key: 'node-switch',
      title: 'Switch Test',
      isEditing: false,
      onEdit: vi.fn(),
    };
    const node = new MindMapNode(props);
    node.createElement(props);

    const container = node.children[0] as Container;
    expect(container.cursor).toBe('default');

    node.createElement({ ...props, isEditing: true });
    expect(container.cursor).toBe('text');
    const box1 = container.children[0] as Container;
    expect(box1.children[0]).toBeInstanceOf(Text);

    node.createElement({ ...props, isEditing: false });
    expect(container.cursor).toBe('default');
    const box2 = container.children[0] as Container;
    expect(box2.children[0]).toBeInstanceOf(Text);
  });

  it('场景3: 边界情况 - 空标题节点', () => {
    // Empty title should show placeholder text
    const props = {
      key: 'node-empty',
      title: '',
      isEditing: false,
      onEdit: vi.fn(),
    };
    const node = new MindMapNode(props);
    node.createElement(props);

    const container = node.children[0] as Container;
    const textBox = container.children[0] as Container;
    const text = textBox.children[0] as Text;

    expect(text.text).toBe('输入文本'); // Placeholder

    node.createElement({ ...props, isEditing: true });
    const textBox2 = container.children[0] as Container;
    const text2 = textBox2.children[0] as Text;
    expect(text2.text).toBe('输入文本');

    node.createElement({ ...props, isEditing: false });
    const textBox3 = container.children[0] as Container;
    const text3 = textBox3.children[0] as Text;
    expect(text3.text).toBe('输入文本');
  });
});
