/** @jsxImportSource @/utils/compiler */
import { ConnectorElement as Connector } from './custom-widget/connector';
import { MindMapLayoutElement as MindMapLayout } from './custom-widget/mindmap-layout';
import { MindMapNodeElement as MindMapNode } from './custom-widget/mindmap-node';
import { ViewportElement as Viewport } from './custom-widget/viewport';

import type { JSXElement } from '@/utils/compiler/jsx-runtime';

export type SceneElement = JSXElement;

/**
 * 创建 Mindmap 场景
 * @param width 视口宽度（像素）
 * @param height 视口高度（像素）
 * @returns 场景 JSX 元素，用于 Runtime.renderFromJSX
 * @example
 * const scene = createScene(800, 600)
 * await runtime.renderFromJSX(scene)
 */
export function createScene(width: number, height: number): SceneElement {
  return (
    <Viewport key="v" scale={1} tx={0} ty={0} width={width} height={height}>
      <MindMapLayout key="layout-root" layout="tree" spacingX={28} spacingY={28}>
        <MindMapNode key="root" title="主题" />
        <MindMapNode key="n1" title="分支 1" />
        <MindMapNode key="n1-1" title="分支 1.1" />
        <MindMapNode key="n1-2" title="分支 1.2" />
        <MindMapNode key="n2" title="分支 2" />
        <MindMapNode key="n2-1" title="分支 2.1" />
        <Connector key="e-root-n1" fromKey="root" toKey="n1" />
        <Connector key="e-root-n2" fromKey="root" toKey="n2" />
        <Connector key="e-n1-n1-1" fromKey="n1" toKey="n1-1" />
        <Connector key="e-n1-n1-2" fromKey="n1" toKey="n1-2" />
        <Connector key="e-n2-n2-1" fromKey="n2" toKey="n2-1" />
      </MindMapLayout>
    </Viewport>
  ) as JSXElement;
}
