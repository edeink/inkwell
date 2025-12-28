import { describe, expect, it } from 'vitest';

import { Side } from '../../type';

import { MindmapDemo } from './index';

// Mock MindmapDemo methods for testing state logic
// Since MindmapDemo is a class component, we can instantiate it or test its logic functions if extracted.
// However, the logic is private in the class.
// We can test the helper functions if we extract them, or we can "test" the class by accessing private methods via 'any' cast (pragmatic for this environment).

describe('MindmapDemo 逻辑测试', () => {
  it('onAddChildSide 应在根节点添加子节点并进入编辑模式', () => {
    // Setup initial state
    const demo = new MindmapDemo({ type: 'MindmapDemo' });
    // Initialize graph
    demo.setGraphData({
      nodes: [{ key: 'root', title: 'Root' }],
      edges: [],
      activeKey: 'root',
    });

    // Access private method
    const onAddChildSide = (demo as any).onAddChildSide;

    // Action
    onAddChildSide('root', Side.Right);

    // Assert
    const state = (demo as any).state;
    const graph = state.graph;

    // 1. Should have a new node
    expect(graph.nodes.size).toBe(2);
    const newKey = Array.from(graph.nodes.keys()).find((k) => k !== 'root');
    expect(newKey).toBeDefined();

    // 2. Should be active
    expect(graph.activeKey).toBe(newKey);

    // 3. Should be editing
    expect(state.editingKey).toBe(newKey);

    // 4. Selection should be cleared
    expect(state.selectedKeys).toEqual([]);
  });

  it('onAddSibling 应为非根节点添加兄弟节点', () => {
    const demo = new MindmapDemo({ type: 'MindmapDemo' });
    demo.setGraphData({
      nodes: [
        { key: 'root', title: 'Root' },
        { key: 'c1', title: 'Child 1', parent: 'root' }, // Helper might need edge
      ],
      edges: [{ from: 'root', to: 'c1' }],
      activeKey: 'c1',
    });

    const onAddSibling = (demo as any).onAddSibling;
    onAddSibling('c1', 1, Side.Right);

    const state = (demo as any).state;
    expect(state.graph.nodes.size).toBe(3);
    expect(state.graph.activeKey).not.toBe('c1');
    expect(state.graph.activeKey).not.toBe('root');
  });

  it('onActive 应激活节点并清除选区', () => {
    const demo = new MindmapDemo({ type: 'MindmapDemo' });
    demo.setGraphData({
      nodes: [
        { key: 'root', title: 'Root' },
        { key: 'n1', title: 'Node 1' },
      ],
      edges: [],
      activeKey: 'root',
    });

    // Set some selection
    (demo as any).onSetSelectedKeys(['root']);
    expect((demo as any).state.selectedKeys).toEqual(['root']);

    // Action: Activate n1
    (demo as any).onActive('n1');

    // Assert
    const state = (demo as any).state;
    expect(state.graph.activeKey).toBe('n1');
    expect(state.selectedKeys).toEqual([]);
    expect(state.editingKey).toBeNull();
  });
});
