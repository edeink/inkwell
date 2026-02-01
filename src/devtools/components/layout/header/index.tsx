import { type Dock } from '..';
import styles from '../index.module.less';

import type { ReactNode } from 'react';

import { Button, Space, Tooltip } from '@/ui';

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
          <Tooltip title="靠左" placement="bottom">
            <Button
              type="text"
              className={dock === 'left' ? styles.btnTextPrimary : styles.btnText}
              aria-label="dock-left"
              aria-pressed={dock === 'left'}
              icon={getDockIcon('left')}
              onClick={() => {
                if (dock !== 'left') {
                  onDockChange('left');
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
              icon={getDockIcon('right')}
              onClick={() => {
                if (dock !== 'right') {
                  onDockChange('right');
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
              icon={getDockIcon('top')}
              onClick={() => {
                if (dock !== 'top') {
                  onDockChange('top');
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
              icon={getDockIcon('bottom')}
              onClick={() => {
                if (dock !== 'bottom') {
                  onDockChange('bottom');
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

function getDockIcon(side: Dock) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className={styles.dockIconSvg}>
      <rect x="1" y="1" width="14" height="14" rx="3" fill="none" stroke="currentColor" />
      {side === 'left' && <rect x="2" y="2" width="4" height="12" rx="2" fill="currentColor" />}
      {side === 'right' && <rect x="10" y="2" width="4" height="12" rx="2" fill="currentColor" />}
      {side === 'top' && <rect x="2" y="2" width="12" height="4" rx="2" fill="currentColor" />}
      {side === 'bottom' && <rect x="2" y="10" width="12" height="4" rx="2" fill="currentColor" />}
    </svg>
  );
}
