/**
 * Devtools 布局容器组件
 *
 * 管理面板停靠位置、尺寸拖拽与树/属性面板分割布局。
 * 注意事项：依赖 DevtoolsStoreProvider 与浏览器环境。
 * 潜在副作用：注册窗口 resize 监听并写入布局状态。
 */
import classnames from 'classnames';
import { throttle } from 'lodash-es';
import {
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { useShallow } from 'zustand/react/shallow';

import { DEVTOOLS_CSS, DEVTOOLS_DOCK, DEVTOOLS_DOM_EVENTS } from '../../constants';
import { clamp } from '../../helper/math';
import { useLayoutStore } from '../../store';

import { LayoutContentGrid } from './content-grid';
import { LayoutHeader } from './header';
import styles from './index.module.less';
import { LayoutResizeHandle } from './resize-handle';

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
export const LayoutPanel = function LayoutPanel({
  visible,
  headerLeft,
  headerRightExtra,
  treePane,
  propsPane,
  onVisibleChange,
}: {
  visible: boolean;
  headerLeft?: ReactNode;
  headerRightExtra?: (requestClose: () => void) => ReactNode;
  treePane: ReactNode;
  propsPane: ReactNode;
  onVisibleChange?: (next: boolean) => void;
}) {
  const {
    dock,
    width,
    height,
    treeWidth,
    treeHeight,
    isNarrow,
    setWidth,
    setHeight,
    setTreeWidth,
    setTreeHeight,
    setIsNarrow,
    setDock,
  } = useLayoutStore(
    useShallow((state) => ({
      dock: state.dock,
      width: state.width,
      height: state.height,
      treeWidth: state.treeWidth,
      treeHeight: state.treeHeight,
      isNarrow: state.isNarrow,
      setWidth: state.setWidth,
      setHeight: state.setHeight,
      setTreeWidth: state.setTreeWidth,
      setTreeHeight: state.setTreeHeight,
      setIsNarrow: state.setIsNarrow,
      setDock: state.setDock,
    })),
  );
  const layout = { dock, width, height, treeWidth, treeHeight, isNarrow };
  const panelRef = useRef<HTMLDivElement | null>(null);

  // TODO 这里有问题
  useEffect(() => {
    const updateNarrow = () => {
      const w =
        panelRef.current?.clientWidth ??
        (dock === DEVTOOLS_DOCK.LEFT || dock === DEVTOOLS_DOCK.RIGHT ? width : window.innerWidth);
      const isNarrowNow = w < 600;
      setIsNarrow((prev) => {
        if (prev === isNarrowNow) {
          return prev;
        }
        // Hysteresis to prevent flickering at boundary
        if (prev && w > 610) {
          return false;
        }
        if (!prev && w < 590) {
          return true;
        }
        return prev;
      });
    };
    updateNarrow();
    window.addEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, updateNarrow);
    return () => window.removeEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, updateNarrow);
  }, [dock, width, setIsNarrow]);

  const dockClass = {
    [DEVTOOLS_DOCK.LEFT]: styles.dockLeft,
    [DEVTOOLS_DOCK.RIGHT]: styles.dockRight,
    [DEVTOOLS_DOCK.TOP]: styles.dockTop,
    [DEVTOOLS_DOCK.BOTTOM]: styles.dockBottom,
  }[dock];

  const handleClass = {
    [DEVTOOLS_DOCK.LEFT]: classnames(styles.resizeHandle, styles.handleLeft),
    [DEVTOOLS_DOCK.RIGHT]: classnames(styles.resizeHandle, styles.handleRight),
    [DEVTOOLS_DOCK.TOP]: classnames(styles.resizeHandle, styles.handleTop),
    [DEVTOOLS_DOCK.BOTTOM]: classnames(styles.resizeHandle, styles.handleBottom),
  }[dock];

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
        setWidth(clamp(startW - dx, 260, Math.min(window.innerWidth - 80, 900)));
      }
      if (dock === DEVTOOLS_DOCK.LEFT) {
        setWidth(clamp(startW + dx, 260, Math.min(window.innerWidth - 80, 900)));
      }
      if (dock === DEVTOOLS_DOCK.TOP) {
        setHeight(clamp(startH + dy, 200, Math.min(window.innerHeight - 80, 800)));
      }
      if (dock === DEVTOOLS_DOCK.BOTTOM) {
        setHeight(clamp(startH - dy, 200, Math.min(window.innerHeight - 80, 800)));
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
        setTreeHeight(nextH);
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
        setTreeWidth(next);
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

  // 渲染
  return (
    <>
      <div
        ref={panelRef}
        className={classnames(
          styles.layoutPanel,
          dockClass,
          DEVTOOLS_CSS.PANEL_CLASS,
          isNarrow && styles.isNarrow,
        )}
        style={
          {
            '--devtools-dock': dock,
            '--devtools-width': `${width}px`,
            '--devtools-height': `${height}px`,
            '--devtools-tree-width': `${treeWidth}px`,
            '--devtools-tree-height': `${treeHeight}px`,
            display: visible ? undefined : 'none',
          } as CSSProperties
        }
      >
        <LayoutHeader
          dock={dock}
          onDockChange={setDock}
          headerLeft={headerLeft}
          headerRightExtra={headerRightExtra}
          onRequestClose={onVisibleChange ? () => onVisibleChange(false) : () => {}}
        />
        <LayoutContentGrid
          treePane={treePane}
          propsPane={propsPane}
          onSplitMouseDown={onSplitMouseDown}
        />
        <LayoutResizeHandle
          className={classnames(styles.resizeHandle, handleClass)}
          cursor={
            dock === DEVTOOLS_DOCK.TOP || dock === DEVTOOLS_DOCK.BOTTOM ? 'ns-resize' : 'ew-resize'
          }
          onResizeMouseDown={onResizeMouseDown}
        />
      </div>
      <style>{`${DEVTOOLS_CSS.PANEL_SELECTOR} { --devtools-dock: ${dock}; }`}</style>
    </>
  );
};

export default LayoutPanel;
