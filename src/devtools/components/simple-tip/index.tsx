import React from 'react';

import { DEVTOOLS_ARIA, DEVTOOLS_PLACEMENT } from '../../constants';

import styles from './index.module.less';

import { Tooltip } from '@/ui';
import { ExclamationCircleOutlined } from '@/ui/icons';

export interface SimpleTipProps {
  message: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function SimpleTip({ message, className, style }: SimpleTipProps) {
  return (
    <div className={[styles.simpleTip, className ?? ''].join(' ').trim()} style={style}>
      <span className={styles.text}>{message}</span>
      <Tooltip title={message} placement={DEVTOOLS_PLACEMENT.TOP}>
        <span className={styles.icon} aria-label={DEVTOOLS_ARIA.MORE_INFO}>
          <ExclamationCircleOutlined />
        </span>
      </Tooltip>
    </div>
  );
}
