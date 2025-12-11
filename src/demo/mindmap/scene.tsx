/** @jsxImportSource @/utils/compiler */
import { MindmapController } from './controller/index';
import { ConnectorElement as Connector } from './custom-widget/connector';
import { ConnectorStyleProviderElement as ConnectorStyleProvider } from './custom-widget/connector-style-provider';
import { MindMapLayoutElement as MindMapLayout } from './custom-widget/mindmap-layout';
import { MindMapNodeElement as MindMapNode } from './custom-widget/mindmap-node';
import { MindMapNodeToolbarElement as MindMapNodeToolbar } from './custom-widget/mindmap-node-toolbar';
import { Side } from './custom-widget/type';
import { ViewportElement as Viewport } from './custom-widget/viewport';

import type { CrudModule } from './controller/modules/crud';
import type Runtime from '@/runtime';
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
export function createScene(width: number, height: number, runtime?: Runtime): SceneElement {
  const getController = (): MindmapController | null => {
    try {
      if (!runtime) {
        return null;
      }
      return MindmapController.getByRuntime(runtime);
    } catch {
      return null;
    }
  };

  const withCrud = <A extends any[]>(
    fn: (c: MindmapController, crud: CrudModule, ...args: A) => void,
  ) => {
    return (...args: A) => {
      try {
        const c = getController();
        if (!c) {
          return;
        }
        const crud = (c as unknown as { crudModule?: CrudModule }).crudModule as
          | CrudModule
          | undefined;
        if (!crud) {
          return;
        }
        fn(c, crud, ...args);
      } catch (e) {
        console.error('Mindmap CRUD callback failed:', e);
      }
    };
  };

  const onSetViewPosition = (tx: number, ty: number): void => {
    try {
      const c = getController();
      c?.setViewPosition(tx, ty);
    } catch (e) {
      console.error('Set view position failed:', e);
    }
  };
  const onZoomAt = (scale: number, cx: number, cy: number): void => {
    try {
      const c = getController();
      c?.zoomAt(scale, cx, cy);
    } catch (e) {
      console.error('Zoom failed:', e);
    }
  };
  const onRenderComplete = (): void => {
    try {
      runtime?.rerender();
    } catch (e) {
      console.error('Render complete handler failed:', e);
    }
  };
  const onDeleteSelection = withCrud((_c, crud) => {
    crud.deleteSelectionWithUndo();
  });
  const onSetSelectedKeys = (keys: string[]): void => {
    try {
      const c = getController();
      if (!c) {
        return;
      }
      c.viewport.setSelectedKeys(keys);
      c.runtime.rerender();
    } catch (e) {
      console.error('Set selected keys failed:', e);
    }
  };
  const onActive = (key: string | null): void => {
    try {
      const c = getController();
      c?.setActiveKey(key ?? null);
    } catch (e) {
      console.error('Set active key failed:', e);
    }
  };
  const onAddSibling = withCrud((_c, crud, refKey: string, dir: -1 | 1) => {
    crud.addSibling(refKey, dir);
  });
  const onAddChildSide = withCrud((_c, crud, refKey: string, side: Side) => {
    crud.addChildSide(refKey, side);
  });
  const onMoveNode = withCrud((_c, crud, key: string, dx: number, dy: number) => {
    crud.moveNode(key, dx, dy);
  });

  return (
    <Viewport
      key="v"
      scale={1}
      tx={0}
      ty={0}
      width={width}
      height={height}
      onSetViewPosition={onSetViewPosition}
      onZoomAt={onZoomAt}
      onRenderComplete={onRenderComplete}
      onDeleteSelection={onDeleteSelection}
      onSetSelectedKeys={onSetSelectedKeys}
    >
      <ConnectorStyleProvider strokeWidth={2} strokeColor="#4a90e2" dashArray="5,3">
        <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
          <MindMapNode key="root" title="主题" onActive={onActive} onMoveNode={onMoveNode} />
          <MindMapNode key="n1" title="分支 1" onActive={onActive} onMoveNode={onMoveNode} />
          <MindMapNode key="n1-1" title="分支 1.1" onActive={onActive} onMoveNode={onMoveNode} />
          <MindMapNode key="n1-2" title="分支 1.2" onActive={onActive} onMoveNode={onMoveNode} />
          <MindMapNode key="n2" title="分支 2" onActive={onActive} onMoveNode={onMoveNode} />
          <MindMapNode key="n2-1" title="分支 2.1" onActive={onActive} onMoveNode={onMoveNode} />
          <MindMapNode key="n3" title="分支 3" onActive={onActive} onMoveNode={onMoveNode} />
          <MindMapNode key="n3-1" title="分支 3.1" onActive={onActive} onMoveNode={onMoveNode} />
          <MindMapNode
            key="n3-1-1"
            title="分支 3.1.1"
            onActive={onActive}
            onMoveNode={onMoveNode}
          />
          <MindMapNode key="n4" title="分支 4" onActive={onActive} onMoveNode={onMoveNode} />
          <MindMapNode key="n4-1" title="分支 4.1" onActive={onActive} onMoveNode={onMoveNode} />
          <MindMapNode
            key="n4-1-1"
            title="分支 4.1.1"
            onActive={onActive}
            onMoveNode={onMoveNode}
          />
          <Connector key="e-root-n1" fromKey="root" toKey="n1" style="elbow" />
          <Connector key="e-root-n2" fromKey="root" toKey="n2" style="elbow" />
          <Connector key="e-n1-n1-1" fromKey="n1" toKey="n1-1" style="elbow" />
          <Connector key="e-n1-n1-2" fromKey="n1" toKey="n1-2" style="elbow" />
          <Connector key="e-n2-n2-1" fromKey="n2" toKey="n2-1" style="elbow" />
          <Connector key="e-root-n3" fromKey="root" toKey="n3" style="elbow" />
          <Connector key="e-n3-n3-1" fromKey="n3" toKey="n3-1" style="elbow" />
          <Connector key="e-n3-1-n3-1-1" fromKey="n3-1" toKey="n3-1-1" style="elbow" />
          <Connector key="e-root-n4" fromKey="root" toKey="n4" style="elbow" />
          <Connector key="e-n4-n4-1" fromKey="n4" toKey="n4-1" style="elbow" />
          <Connector key="e-n4-1-n4-1-1" fromKey="n4-1" toKey="n4-1-1" style="elbow" />
          <MindMapNodeToolbar
            key="toolbar"
            onAddSibling={onAddSibling}
            onAddChildSide={onAddChildSide}
          />
        </MindMapLayout>
      </ConnectorStyleProvider>
    </Viewport>
  ) as JSXElement;
}
