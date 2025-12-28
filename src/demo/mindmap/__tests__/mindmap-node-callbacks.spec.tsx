/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapNode } from '../widgets/mindmap-node';

import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('MindMapNode Callbacks', () => {
  it('onFinish callback should update title and stop editing', () => {
    const onEdit = vi.fn();
    const node = new MindMapNode({
      type: CustomComponentType.MindMapNode,
      title: 'Original',
      isEditing: true,
      onEdit,
      activeKey: 'test-node',
      key: 'test-node',
    } as any);

    // Render and find Editor props
    const element = node.render();
    const data = compileElement(element);

    // MindMapNode renders Container -> children[0] is Editor (when editing)
    expect(data.children).toBeDefined();
    const editorData = data.children?.[0];

    expect(editorData).toBeDefined();
    // Check type (it's compiled to string name)
    expect((editorData as any)?.type).toBe('MindMapNodeTextEditor');

    // Check props
    expect(editorData?.text).toBe('Original');

    // Simulate onFinish
    const onFinish = editorData?.onFinish as (val: string) => void;
    expect(onFinish).toBeDefined();

    onFinish('New Title');

    // Check state update
    // @ts-ignore
    expect(node.state.isEditing).toBe(false);
    // @ts-ignore
    expect(node.state.title).toBe('New Title');
    expect(onEdit).toHaveBeenCalledWith(null);
  });

  it('onCancel callback should stop editing without updating title', () => {
    const onEdit = vi.fn();
    const node = new MindMapNode({
      type: CustomComponentType.MindMapNode,
      title: 'Original',
      isEditing: true,
      onEdit,
      activeKey: 'test-node',
      key: 'test-node',
    } as any);

    const element = node.render();
    const data = compileElement(element);
    const editorData = data.children?.[0];

    // Simulate onCancel
    const onCancel = editorData?.onCancel as () => void;
    expect(onCancel).toBeDefined();

    onCancel();

    // Check state update
    // @ts-ignore
    expect(node.state.isEditing).toBe(false);
    // @ts-ignore
    expect(node.state.title).toBe('Original'); // Should remain original
    expect(onEdit).toHaveBeenCalledWith(null);
  });

  it('onChange should not be present (to support cancel)', () => {
    const node = new MindMapNode({
      type: CustomComponentType.MindMapNode,
      title: 'Original',
      isEditing: true,
    } as any);

    const element = node.render();
    const data = compileElement(element);
    const editorData = data.children?.[0];

    // We removed onChange, so it should be undefined or null
    expect(editorData?.onChange).toBeUndefined();
  });
});
