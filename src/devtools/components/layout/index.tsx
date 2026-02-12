import classnames from 'classnames';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';

import { DEVTOOLS_CSS, DEVTOOLS_DOCK, DEVTOOLS_DOM_EVENTS } from '../../constants';
import { clamp } from '../../helper/math';
import globalStyles from '../../index.module.less';

import { LayoutContentGrid } from './content-grid';
import { LayoutHeader } from './header';
import styles from './index.module.less';
import { LayoutResizeHandle } from './resize-handle';

import {
  DEVTOOLS_LAYOUT,
  DEVTOOLS_SPLIT,
  DEVTOOLS_SPLIT_DEFAULT,
  getDevtoolsDefaultLayout,
} from '@/utils/local-storage';

/**
 * Dock 位置枚举
 * 控制面板停靠在窗口的左/右/上/下
 */
export type Dock = (typeof DEVTOOLS_DOCK)[keyof typeof DEVTOOLS_DOCK];

/**
 * 布局信息
 * 由 LayoutPanel 计算并传递给子渲染函数
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
 * 提供停靠位置切换、窗口尺寸拖拽与内部面板分割
 * 通过 renderTree/renderProps 插槽接入具体内容
 */
export function LayoutPanel({
  visible,
  headerLeft,
  headerRightExtra,
  renderTree,
  renderProps,
  onVisibleChange,
}: {
  visible: boolean;
  headerLeft?: ReactNode;
  headerRightExtra?: (requestClose: () => void) => ReactNode;
  renderTree: (info: LayoutInfo) => ReactNode;
  renderProps: (info: LayoutInfo) => ReactNode;
  onVisibleChange?: (next: boolean) => void;
}) {
  const initialLayout = DEVTOOLS_LAYOUT.get() ?? getDevtoolsDefaultLayout();
  const [dock, setDock] = useState<Dock>(initialLayout.dock);
  const [width, setWidth] = useState<number>(initialLayout.width);
  const [height, setHeight] = useState<number>(initialLayout.height);
  // visible 由父组件控制；此处不再使用内部关闭态
  const panelRef = useRef<HTMLDivElement | null>(null);

  const initialSplit = DEVTOOLS_SPLIT.get() ?? DEVTOOLS_SPLIT_DEFAULT;
  const [treeWidth, setTreeWidth] = useState<number>(initialSplit.treeWidth);
  const [treeHeight, setTreeHeight] = useState<number>(initialSplit.treeHeight);
  const [isNarrow, setIsNarrow] = useState<boolean>(false);

  useEffect(() => {
    const updateNarrow = () => {
      const w =
        panelRef.current?.clientWidth ??
        (dock === DEVTOOLS_DOCK.LEFT || dock === DEVTOOLS_DOCK.RIGHT ? width : window.innerWidth);
      setIsNarrow(w < 600);
    };
    updateNarrow();
    window.addEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, updateNarrow);
    return () => window.removeEventListener(DEVTOOLS_DOM_EVENTS.RESIZE, updateNarrow);
  }, [dock, width]);

  useEffect(() => {
    DEVTOOLS_LAYOUT.set({ dock, width, height });
  }, [dock, width, height]);

  useEffect(() => {
    DEVTOOLS_SPLIT.set({ treeWidth, treeHeight });
  }, [treeWidth, treeHeight]);

  function onResizeMouseDown(e: ReactMouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = width;
    const startH = height;
    function onMove(ev: globalThis.MouseEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
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
    }
    function onUp() {
      document.removeEventListener(DEVTOOLS_DOM_EVENTS.MOUSEMOVE, onMove);
      document.removeEventListener(DEVTOOLS_DOM_EVENTS.MOUSEUP, onUp);
    }
    document.addEventListener(DEVTOOLS_DOM_EVENTS.MOUSEMOVE, onMove);
    document.addEventListener(DEVTOOLS_DOM_EVENTS.MOUSEUP, onUp);
  }

  function onSplitMouseDown(e: ReactMouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = treeWidth;
    const startH = treeHeight;
    function onMove(ev: globalThis.MouseEvent) {
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
    }
    function onUp() {
      document.removeEventListener(DEVTOOLS_DOM_EVENTS.MOUSEMOVE, onMove);
      document.removeEventListener(DEVTOOLS_DOM_EVENTS.MOUSEUP, onUp);
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

  const info: LayoutInfo = { dock, width, height, treeWidth, treeHeight, isNarrow };
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
        onDockChange={setDock}
        onRequestClose={() => onVisibleChange?.(false)}
      />
      <LayoutContentGrid
        info={info}
        renderTree={renderTree}
        renderProps={renderProps}
        onSplitMouseDown={onSplitMouseDown}
      />
      <LayoutResizeHandle
        className={handleClass}
        cursor={cursor}
        onResizeMouseDown={onResizeMouseDown}
      />
    </div>
  );
}

export default LayoutPanel;
