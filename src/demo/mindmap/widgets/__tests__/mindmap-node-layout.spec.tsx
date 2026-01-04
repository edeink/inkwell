import { describe, expect, it, vi } from 'vitest';

import { CustomComponentType } from '../../type';
import { MindMapNode } from '../mindmap-node';

import type { BoxConstraints } from '@/core/type';

import { Widget } from '@/core/base';
import { Container } from '@/core/container';
import { WidgetRegistry } from '@/core/registry';
import { Text } from '@/core/text';

// Mock getTheme
vi.mock('../../constants/theme', () => ({
  getTheme: () => ({
    backgroundColor: '#fff',
    nodeEditFillColor: '#eee',
    nodeActiveFillColor: '#ddd',
    nodeSelectedFillColor: '#ccc',
    nodeFillColor: '#bbb',
    textColor: '#000',
    placeholder: {
      fontSize: 12,
      textColor: '#999',
      textAlign: 'left',
      lineHeight: 1.5,
    },
    nodeEditBorderColor: '#000',
    nodeActiveBorderColor: '#111',
    nodeHoverBorderColor: '#222',
    nodeSelectedBorderColor: '#333',
    nodeDefaultBorderColor: '#444',
  }),
}));

describe('MindMapNode Layout Update', () => {
  // Register components
  WidgetRegistry.registerType(CustomComponentType.MindMapNode, MindMapNode);
  WidgetRegistry.registerType('Container', Container);
  WidgetRegistry.registerType('Text', Text);

  class MockEditableText extends Widget {
    constructor(props: any) {
      super({ ...props, type: 'EditableText' });
    }
    // Mock layout to avoid errors if layout is called
    protected performLayout(constraints: BoxConstraints) {
      return { width: 100, height: 20 };
    }
  }
  WidgetRegistry.registerType('EditableText', MockEditableText);

  it('场景1: 从编辑状态切换回阅读状态时，Container应该标记为需要布局', () => {
    const initialProps = {
      type: CustomComponentType.MindMapNode,
      title: 'Test Node',
      isEditing: true,
      onEdit: vi.fn(),
      // Mock getViewState for render
      getViewState: () => ({ scale: 1, tx: 0, ty: 0 }),
    };

    const node = new MindMapNode(initialProps);

    // 1. Initial Render (Editing)
    // createElement calls render(), compiles it, and calls buildChildren on itself.
    // This creates the Container child.
    node.createElement(initialProps);

    const container = node.children[0] as Container;
    expect(container).toBeInstanceOf(Container);
    expect(container.children[0].type).toBe('EditableText');

    // Clear dirty flags to simulate stable state
    (container as any)._needsLayout = false;

    // 2. Switch to Reading (isEditing = false)
    const newProps = { ...initialProps, isEditing: false };
    node.createElement(newProps);

    // 3. Verify
    const newContainer = node.children[0] as Container;
    expect(newContainer).toBe(container); // Container should be reused

    // The child of container should now be Text
    expect(newContainer.children[0]).toBeInstanceOf(Text);

    // CRITICAL CHECK: Container must be marked for layout because children changed
    expect((newContainer as any)._needsLayout).toBe(true);

    // Verify padding is still there (props update ensures it)
    // padding={[12, 8]} means vertical=12, horizontal=8
    expect(newContainer.padding).toEqual({ left: 8, top: 12, right: 8, bottom: 12 });
  });

  it('场景2: 连续切换状态多次，布局更新应该始终正确触发', () => {
    const props = {
      type: CustomComponentType.MindMapNode,
      title: 'Switch Test',
      isEditing: false,
      onEdit: vi.fn(),
    };
    const node = new MindMapNode(props);
    node.createElement(props);

    const container = node.children[0] as Container;

    // Cycle 1: Read -> Edit
    node.createElement({ ...props, isEditing: true });
    expect(container.children[0].type).toBe('EditableText');
    expect((container as any)._needsLayout).toBe(true);

    // Reset flag
    (container as any)._needsLayout = false;

    // Cycle 2: Edit -> Read
    node.createElement({ ...props, isEditing: false });
    expect(container.children[0]).toBeInstanceOf(Text);
    expect((container as any)._needsLayout).toBe(true);
  });

  it('场景3: 边界情况 - 空标题节点', () => {
    // Empty title should show placeholder text
    const props = {
      type: CustomComponentType.MindMapNode,
      title: '',
      isEditing: false,
      onEdit: vi.fn(),
    };
    const node = new MindMapNode(props);
    node.createElement(props);

    const container = node.children[0] as Container;
    const text = container.children[0] as Text;

    expect(text.text).toBe('输入文本'); // Placeholder

    // Switch to edit
    node.createElement({ ...props, isEditing: true });
    expect(container.children[0].type).toBe('EditableText');

    // Switch back
    (container as any)._needsLayout = false;
    node.createElement({ ...props, isEditing: false });
    expect((container as any)._needsLayout).toBe(true);
  });
});
