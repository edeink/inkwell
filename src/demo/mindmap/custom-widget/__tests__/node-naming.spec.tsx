import { describe, expect, it } from 'vitest';

import { Scene, type GraphState } from '../../scene';

describe('Node Naming Logic', () => {
  it('should name root children as Node X', () => {
    const scene = new Scene({ width: 800, height: 600, type: 'Scene' });
    const state: GraphState = {
      nodes: new Map([['root', { id: 'root', title: 'Root' }]]),
      edges: [],
      activeKey: null,
      version: 1,
      nextId: 1000,
    };

    // 0 children -> Node 1
    const title1 = (scene as any).generateNodeTitle(state, 'root');
    expect(title1).toBe('节点 1');

    // 1 child -> Node 2
    state.edges.push({ from: 'root', to: 'n1' });
    const title2 = (scene as any).generateNodeTitle(state, 'root');
    expect(title2).toBe('节点 2');
  });

  it('should name sub-children as Parent-X', () => {
    const scene = new Scene({ width: 800, height: 600, type: 'Scene' });
    const state: GraphState = {
      nodes: new Map([
        ['root', { id: 'root', title: 'Root' }],
        ['n1', { id: 'n1', title: 'Node 1' }],
        ['n4', { id: 'n4', title: '节点 4' }], // Test with Chinese/English mix
      ]),
      edges: [
        { from: 'root', to: 'n1' },
        { from: 'root', to: 'n4' },
      ],
      activeKey: null,
      version: 1,
      nextId: 1000,
    };

    // Child of Node 1 (0 existing) -> Node 1-1
    const title1 = (scene as any).generateNodeTitle(state, 'n1');
    expect(title1).toBe('Node 1-1');

    // Child of Node 4 (0 existing) -> 节点 4-1
    const title2 = (scene as any).generateNodeTitle(state, 'n4');
    expect(title2).toBe('节点 4-1');

    // Child of Node 4 (1 existing) -> 节点 4-2
    state.edges.push({ from: 'n4', to: 'n4-1' });
    const title3 = (scene as any).generateNodeTitle(state, 'n4');
    expect(title3).toBe('节点 4-2');
  });
});
