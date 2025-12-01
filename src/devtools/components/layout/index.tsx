import { Button, Space, Tooltip } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

import { clamp } from '../../helper/math';

import styles from './index.module.less';

/**
 * Dock 位置枚举
 * 控制面板停靠在窗口的左/右/上/下
 */
export type Dock = 'left' | 'right' | 'top' | 'bottom';

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
  headerLeft?: React.ReactNode;
  headerRightExtra?: (requestClose: () => void) => React.ReactNode;
  renderTree: (info: LayoutInfo) => React.ReactNode;
  renderProps: (info: LayoutInfo) => React.ReactNode;
  onVisibleChange?: (next: boolean) => void;
}) {
  const storageKey = 'INKWELL_DEVTOOLS_LAYOUT';
  const initialLayout = (() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return { dock: 'right', width: 380, height: Math.min(window.innerHeight, 420) } as {
      dock: Dock;
      width: number;
      height: number;
    };
  })();
  const [dock, setDock] = useState<Dock>(initialLayout.dock);
  const [width, setWidth] = useState<number>(initialLayout.width);
  const [height, setHeight] = useState<number>(initialLayout.height);
  // visible is controlled by parent; remove internal closing state
  const panelRef = useRef<HTMLDivElement | null>(null);

  const splitStorageKey = 'INKWELL_DEVTOOLS_SPLIT';
  const initialSplit = (() => {
    try {
      const raw = localStorage.getItem(splitStorageKey);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return { treeWidth: 300, treeHeight: 240 } as { treeWidth: number; treeHeight: number };
  })();
  const [treeWidth, setTreeWidth] = useState<number>(initialSplit.treeWidth);
  const [treeHeight, setTreeHeight] = useState<number>(initialSplit.treeHeight);
  const [isNarrow, setIsNarrow] = useState<boolean>(false);

  useEffect(() => {
    const updateNarrow = () => {
      const w =
        panelRef.current?.clientWidth ??
        (dock === 'left' || dock === 'right' ? width : window.innerWidth);
      setIsNarrow(w < 600);
    };
    updateNarrow();
    window.addEventListener('resize', updateNarrow);
    return () => window.removeEventListener('resize', updateNarrow);
  }, [dock, width]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ dock, width, height }));
    } catch {}
  }, [dock, width, height]);

  useEffect(() => {
    try {
      localStorage.setItem(splitStorageKey, JSON.stringify({ treeWidth, treeHeight }));
    } catch {}
  }, [treeWidth, treeHeight]);

  function onResizeMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = width;
    const startH = height;
    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (dock === 'right') {
        setWidth(clamp(startW - dx, 260, Math.min(window.innerWidth - 80, 900)));
      }
      if (dock === 'left') {
        setWidth(clamp(startW + dx, 260, Math.min(window.innerWidth - 80, 900)));
      }
      if (dock === 'top') {
        setHeight(clamp(startH + dy, 200, Math.min(window.innerHeight - 80, 800)));
      }
      if (dock === 'bottom') {
        setHeight(clamp(startH - dy, 200, Math.min(window.innerHeight - 80, 800)));
      }
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function onSplitMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = treeWidth;
    const startH = treeHeight;
    function onMove(ev: MouseEvent) {
      if (isNarrow) {
        const dy = ev.clientY - startY;
        const maxH = Math.max(
          160,
          dock === 'top' || dock === 'bottom' ? height - 160 : window.innerHeight - 200,
        );
        const nextH = clamp(startH + dy, 140, maxH);
        setTreeHeight(nextH);
      } else {
        const dx = ev.clientX - startX;
        const next = clamp(
          startW + dx,
          200,
          Math.min((dock === 'left' || dock === 'right' ? width : window.innerWidth) - 240, 800),
        );
        setTreeWidth(next);
      }
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const cursor = dock === 'top' || dock === 'bottom' ? 'ns-resize' : 'ew-resize';
  const panelClass = [
    styles.layoutPanel,
    styles[`dock-${dock}`],
    !visible ? styles.closing : '',
  ].join(' ');
  const handleClass = [styles.resizeHandle, styles[`handle-${dock}`]].join(' ');
  const gridClass = [styles.layoutContentGrid, isNarrow ? styles.narrow : ''].join(' ');

  const info: LayoutInfo = { dock, width, height, treeWidth, treeHeight, isNarrow };

  return (
    <div
      ref={panelRef}
      className={panelClass}
      style={dock === 'top' || dock === 'bottom' ? { height } : { width }}
      data-visible={visible ? '1' : '0'}
    >
      <div className={styles.layoutHeader}>
        <div className={styles.left}>{headerLeft}</div>
        <div className={styles.right}>
          <Space.Compact>
            <Tooltip title="靠左" placement="bottom">
              <Button
                type="text"
                className={dock === 'left' ? styles.btnTextPrimary : styles.btnText}
                aria-label="dock-left"
                aria-pressed={dock === 'left'}
                icon={<DockIcon side="left" active={dock === 'left'} />}
                onClick={() => {
                  if (dock !== 'left') {
                    setDock('left');
                  }
                }}
              />
            </Tooltip>
            <Tooltip title="靠右" placement="bottom">
              <Button
                type="text"
                className={dock === 'right' ? styles.btnTextPrimary : styles.btnText}
                aria-label="dock-right"
                aria-pressed={dock === 'right'}
                icon={<DockIcon side="right" active={dock === 'right'} />}
                onClick={() => {
                  if (dock !== 'right') {
                    setDock('right');
                  }
                }}
              />
            </Tooltip>
            <Tooltip title="靠上" placement="bottom">
              <Button
                type="text"
                className={dock === 'top' ? styles.btnTextPrimary : styles.btnText}
                aria-label="dock-top"
                aria-pressed={dock === 'top'}
                icon={<DockIcon side="top" active={dock === 'top'} />}
                onClick={() => {
                  if (dock !== 'top') {
                    setDock('top');
                  }
                }}
              />
            </Tooltip>
            <Tooltip title="靠下" placement="bottom">
              <Button
                type="text"
                className={dock === 'bottom' ? styles.btnTextPrimary : styles.btnText}
                aria-label="dock-bottom"
                aria-pressed={dock === 'bottom'}
                icon={<DockIcon side="bottom" active={dock === 'bottom'} />}
                onClick={() => {
                  if (dock !== 'bottom') {
                    setDock('bottom');
                  }
                }}
              />
            </Tooltip>
          </Space.Compact>
          {headerRightExtra?.(() => {
            onVisibleChange?.(false);
          })}
        </div>
      </div>
      <div
        className={gridClass}
        style={
          isNarrow
            ? {
                gridTemplateRows: `${treeHeight}px 8px 1fr`,
                ...(dock === 'top' || dock === 'bottom'
                  ? { height: `calc(${height}px - 42px)` }
                  : { height: 'calc(100vh - 42px)' }),
              }
            : {
                gridTemplateColumns: `${treeWidth}px 8px 1fr`,
                ...(dock === 'top' || dock === 'bottom'
                  ? { height: `calc(${height}px - 42px)` }
                  : { height: 'calc(100vh - 42px)' }),
              }
        }
      >
        <div className={styles.treePane} style={isNarrow ? { gridRow: '1 / 2' } : undefined}>
          {renderTree(info)}
        </div>
        <div
          className={styles.splitHandle}
          style={
            isNarrow
              ? { gridRow: '2 / 3', cursor: 'row-resize' }
              : { gridColumn: '2 / 3', cursor: 'col-resize' }
          }
          onMouseDown={onSplitMouseDown}
        />
        <div className={styles.propsPane} style={isNarrow ? { gridRow: '3 / 4' } : undefined}>
          {renderProps(info)}
        </div>
      </div>
      <div onMouseDown={onResizeMouseDown} className={handleClass} style={{ cursor }} />
    </div>
  );
}

export default LayoutPanel;
function DockIcon({ side, active }: { side: Dock; active?: boolean }) {
  const c = active ? '#1677ff' : '#6b7280';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <rect x="1" y="1" width="14" height="14" rx="3" fill="none" stroke={c} />
      {side === 'left' && <rect x="2" y="2" width="4" height="12" rx="2" fill={c} />}
      {side === 'right' && <rect x="10" y="2" width="4" height="12" rx="2" fill={c} />}
      {side === 'top' && <rect x="2" y="2" width="12" height="4" rx="2" fill={c} />}
      {side === 'bottom' && <rect x="2" y="10" width="12" height="4" rx="2" fill={c} />}
    </svg>
  );
}
