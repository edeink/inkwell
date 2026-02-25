/**
 * Devtools 布局容器组件
 *
 * 管理面板停靠位置、尺寸拖拽与树/属性面板分割布局。
 * 注意事项：依赖 DevtoolsStoreProvider 与浏览器环境。
 * 潜在副作用：注册窗口 resize 监听并写入布局状态。
 */
import classnames from 'classnames';
import { throttle } from 'lodash-es';
import { observer } from 'mobx-react-lite';
import {
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';

import { DEVTOOLS_CSS, DEVTOOLS_DOCK, DEVTOOLS_DOM_EVENTS } from '../../constants';
import { clamp } from '../../helper/math';
import globalStyles from '../../index.module.less';
import { useDevtoolsStore } from '../../store';

import { LayoutContentGrid } from './content-grid';
import { LayoutHeader } from './header';
import styles from './index.module.less';
import { LayoutResizeHandle } from './resize-handle';

import type { DevtoolsPropsPaneProps } from '@/devtools/components/devtools-panel/props-pane';
import type { DevtoolsTreePaneProps } from '@/devtools/components/devtools-panel/tree-pane';

/**
 * Dock 位置枚举
 *
 * 控制面板停靠在窗口的左/右/上/下。
 * 注意事项：与 DEVTOOLS_DOCK 常量保持一致。
 * 潜在副作用：无。
 */
export type Dock = (typeof DEVTOOLS_DOCK)[keyof typeof DEVTOOLS_DOCK];

/**
 * 布局信息
 *
 * 由 LayoutPanel 计算并传递给子渲染函数。
 * 注意事项：尺寸单位与布局容器一致。
 * 潜在副作用：无。
 */
export type LayoutInfo = {
  dock: Dock;
  width: number;
  height: number;
  treeWidth: number;
  treeHeight: number;
  isNarrow: boolean;
};

/**
 * LayoutPanel
 *
 * @param props 布局容器参数
 * @returns React 元素
 * @remarks
 * 注意事项：visible 为 false 时会隐藏面板。
 * 潜在副作用：可能触发窗口 resize 监听。
 */
export const LayoutPanel = observer(function LayoutPanel({
  visible,
  headerLeft,
  headerRightExtra,
  treePaneProps,
  propsPaneProps,
  onVisibleChange,
}: {
  visible: boolean;
  headerLeft?: ReactNode;
  headerRightExtra?: (requestClose: () => void) => ReactNode;
  treePaneProps: Omit<DevtoolsTreePaneProps, 'info'>;
  propsPaneProps: DevtoolsPropsPaneProps;
  onVisibleChange?: (next: boolean) => void;
}) {
  const { layout } = useDevtoolsStore();
  const { dock, width, height, treeWidth, treeHeight, isNarrow } = layout;
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateNarrow = () => {
      const w =
        panelRef.current?.clientWidth ??
        (dock === DEVTOOLS_DOCK.LEFT || dock === DEVTOOLS_DOCK.RIGHT ? width : window.innerWidth);
      layout.setIsNarrow(w < 600);
    };
    updateNarrow();
    window.addEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, updateNarrow);
    return () => window.removeEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, updateNarrow);
  }, [dock, width, layout]);

  /**
   * 处理面板尺寸拖拽
   *
   * @param e 鼠标按下事件
   * @returns void
   * @remarks
   * 注意事项：会阻止默认选中行为。
   * 潜在副作用：注册 document 的鼠标监听。
   */
  function onResizeMouseDown(e: ReactMouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = width;
    const startH = height;
    const onMove = throttle((ev: globalThis.MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      // 根据停靠方向调整宽高
      if (dock === DEVTOOLS_DOCK.RIGHT) {
        layout.setWidth(clamp(startW - dx, 260, Math.min(window.innerWidth - 80, 900)));
      }
      if (dock === DEVTOOLS_DOCK.LEFT) {
        layout.setWidth(clamp(startW + dx, 260, Math.min(window.innerWidth - 80, 900)));
      }
      if (dock === DEVTOOLS_DOCK.TOP) {
        layout.setHeight(clamp(startH + dy, 200, Math.min(window.innerHeight - 80, 800)));
      }
      if (dock === DEVTOOLS_DOCK.BOTTOM) {
        layout.setHeight(clamp(startH - dy, 200, Math.min(window.innerHeight - 80, 800)));
      }
    }, 16);
    function onUp() {
      document.removeEventListener(DEVTOOLS_DOM_EVENTS.MOUSEMOVE, onMove);
      document.removeEventListener(DEVTOOLS_DOM_EVENTS.MOUSEUP, onUp);
      onMove.cancel();
    }
    document.addEventListener(DEVTOOLS_DOM_EVENTS.MOUSEMOVE, onMove);
    document.addEventListener(DEVTOOLS_DOM_EVENTS.MOUSEUP, onUp);
  }

  /**
   * 处理树/属性面板分割拖拽
   *
   * @param e 鼠标按下事件
   * @returns void
   * @remarks
   * 注意事项：窄屏模式下拖拽方向为纵向。
   * 潜在副作用：注册 document 的鼠标监听。
   */
  function onSplitMouseDown(e: ReactMouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = treeWidth;
    const startH = treeHeight;
    const onMove = throttle((ev: globalThis.MouseEvent) => {
      if (isNarrow) {
        const dy = ev.clientY - startY;
        const maxH = Math.max(
          160,
          dock === DEVTOOLS_DOCK.TOP || dock === DEVTOOLS_DOCK.BOTTOM
            ? height - 160
            : window.innerHeight - 200,
        );
        const nextH = clamp(startH + dy, 140, maxH);
        layout.setTreeHeight(nextH);
      } else {
        const dx = ev.clientX - startX;
        const next = clamp(
          startW + dx,
          200,
          Math.min(
            (dock === DEVTOOLS_DOCK.LEFT || dock === DEVTOOLS_DOCK.RIGHT
              ? width
              : window.innerWidth) - 240,
            800,
          ),
        );
        layout.setTreeWidth(next);
      }
    }, 16);
    function onUp() {
      document.removeEventListener(DEVTOOLS_DOM_EVENTS.MOUSEMOVE, onMove);
      document.removeEventListener(DEVTOOLS_DOM_EVENTS.MOUSEUP, onUp);
      onMove.cancel();
    }
    document.addEventListener(DEVTOOLS_DOM_EVENTS.MOUSEMOVE, onMove);
    document.addEventListener(DEVTOOLS_DOM_EVENTS.MOUSEUP, onUp);
  }

  const cursor =
    dock === DEVTOOLS_DOCK.TOP || dock === DEVTOOLS_DOCK.BOTTOM ? 'ns-resize' : 'ew-resize';
  const panelClass = classnames(
    styles.layoutPanel,
    globalStyles.panel,
    DEVTOOLS_CSS.PANEL_CLASS,
    styles[`dock-${dock}`],
    {
      [styles.closing]: !visible,
      [styles.isNarrow]: isNarrow,
    },
  );
  const handleClass = classnames(styles.resizeHandle, styles[`handle-${dock}`]);

  const info: LayoutInfo = layout.layoutInfo;
  const panelStyle: CSSProperties & Record<string, string | number | undefined> = (() => {
    if (dock === 'top' || dock === 'bottom') {
      return {
        height,
        '--tree-width': `${treeWidth}px`,
        '--tree-height': `${treeHeight}px`,
        '--grid-height': `calc(${height}px - 53px)`,
      };
    }
    return {
      width,
      '--tree-width': `${treeWidth}px`,
      '--tree-height': `${treeHeight}px`,
      '--grid-height': 'calc(100vh - 53px)',
    };
  })();

  return (
    <div
      ref={panelRef}
      className={panelClass}
      style={panelStyle}
      data-visible={visible ? '1' : '0'}
      onWheel={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <LayoutHeader
        dock={dock}
        headerLeft={headerLeft}
        headerRightExtra={headerRightExtra}
        onDockChange={layout.setDock.bind(layout)}
        onRequestClose={() => onVisibleChange?.(false)}
      />
      <LayoutContentGrid
        info={info}
        treePaneProps={treePaneProps}
        propsPaneProps={propsPaneProps}
        onSplitMouseDown={onSplitMouseDown}
      />
      <LayoutResizeHandle
        className={handleClass}
        cursor={cursor}
        onResizeMouseDown={onResizeMouseDown}
      />
    </div>
  );
});

export default LayoutPanel;
