/**
 * Devtools 布局标题栏
 *
 * 渲染停靠位置切换按钮与右侧扩展区域。
 * 注意事项：onDockChange 需保证状态同步。
 * 潜在副作用：触发布局状态更新。
 */
import { type Dock } from '..';
import { DEVTOOLS_DOCK, DEVTOOLS_PLACEMENT } from '../../../constants';
import styles from '../index.module.less';

import type { ReactNode } from 'react';

import { Button, Space, Tooltip } from '@/ui';

/**
 * LayoutHeader
 *
 * @param props 标题栏参数
 * @returns React 元素
 * @remarks
 * 注意事项：onRequestClose 需负责隐藏面板。
 * 潜在副作用：触发布局状态更新。
 */
export function LayoutHeader({
  dock,
  headerLeft,
  headerRightExtra,
  onDockChange,
  onRequestClose,
}: {
  dock: Dock;
  headerLeft?: ReactNode;
  headerRightExtra?: (requestClose: () => void) => ReactNode;
  onDockChange: (dock: Dock) => void;
  onRequestClose: () => void;
}) {
  return (
    <div className={styles.layoutHeader}>
      <div className={styles.left}>{headerLeft}</div>
      <div className={styles.right}>
        <Space.Compact>
          <Tooltip title="靠左" placement={DEVTOOLS_PLACEMENT.BOTTOM}>
            <Button
              type="text"
              className={dock === DEVTOOLS_DOCK.LEFT ? styles.btnTextPrimary : styles.btnText}
              aria-label="dock-left"
              aria-pressed={dock === DEVTOOLS_DOCK.LEFT}
              icon={getDockIcon(DEVTOOLS_DOCK.LEFT)}
              onClick={() => {
                if (dock !== DEVTOOLS_DOCK.LEFT) {
                  onDockChange(DEVTOOLS_DOCK.LEFT);
                }
              }}
            />
          </Tooltip>
          <Tooltip title="靠右" placement={DEVTOOLS_PLACEMENT.BOTTOM}>
            <Button
              type="text"
              className={dock === DEVTOOLS_DOCK.RIGHT ? styles.btnTextPrimary : styles.btnText}
              aria-label="dock-right"
              aria-pressed={dock === DEVTOOLS_DOCK.RIGHT}
              icon={getDockIcon(DEVTOOLS_DOCK.RIGHT)}
              onClick={() => {
                if (dock !== DEVTOOLS_DOCK.RIGHT) {
                  onDockChange(DEVTOOLS_DOCK.RIGHT);
                }
              }}
            />
          </Tooltip>
          <Tooltip title="靠上" placement={DEVTOOLS_PLACEMENT.BOTTOM}>
            <Button
              type="text"
              className={dock === DEVTOOLS_DOCK.TOP ? styles.btnTextPrimary : styles.btnText}
              aria-label="dock-top"
              aria-pressed={dock === DEVTOOLS_DOCK.TOP}
              icon={getDockIcon(DEVTOOLS_DOCK.TOP)}
              onClick={() => {
                if (dock !== DEVTOOLS_DOCK.TOP) {
                  onDockChange(DEVTOOLS_DOCK.TOP);
                }
              }}
            />
          </Tooltip>
          <Tooltip title="靠下" placement={DEVTOOLS_PLACEMENT.BOTTOM}>
            <Button
              type="text"
              className={dock === DEVTOOLS_DOCK.BOTTOM ? styles.btnTextPrimary : styles.btnText}
              aria-label="dock-bottom"
              aria-pressed={dock === DEVTOOLS_DOCK.BOTTOM}
              icon={getDockIcon(DEVTOOLS_DOCK.BOTTOM)}
              onClick={() => {
                if (dock !== DEVTOOLS_DOCK.BOTTOM) {
                  onDockChange(DEVTOOLS_DOCK.BOTTOM);
                }
              }}
            />
          </Tooltip>
        </Space.Compact>
        {headerRightExtra?.(onRequestClose)}
      </div>
    </div>
  );
}

/**
 * 获取停靠方向图标
 *
 * @param side 停靠方向
 * @returns SVG 图标节点
 * @remarks
 * 注意事项：仅用于渲染。
 * 潜在副作用：无。
 */
function getDockIcon(side: Dock) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className={styles.dockIconSvg}>
      <rect x="1" y="1" width="14" height="14" rx="3" fill="none" stroke="currentColor" />
      {side === DEVTOOLS_DOCK.LEFT && (
        <rect x="2" y="2" width="4" height="12" rx="2" fill="currentColor" />
      )}
      {side === DEVTOOLS_DOCK.RIGHT && (
        <rect x="10" y="2" width="4" height="12" rx="2" fill="currentColor" />
      )}
      {side === DEVTOOLS_DOCK.TOP && (
        <rect x="2" y="2" width="12" height="4" rx="2" fill="currentColor" />
      )}
      {side === DEVTOOLS_DOCK.BOTTOM && (
        <rect x="2" y="10" width="12" height="4" rx="2" fill="currentColor" />
      )}
    </svg>
  );
}
