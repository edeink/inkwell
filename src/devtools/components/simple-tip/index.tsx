import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import React from 'react';

import styles from './index.module.less';

export interface SimpleTipProps {
  message: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function SimpleTip({ message, className, style }: SimpleTipProps) {
  return (
    <div className={[styles.simpleTip, className ?? ''].join(' ').trim()} style={style}>
      <span className={styles.text}>{message}</span>
      <Tooltip
        title={message}
        placement="top"
        overlayClassName={styles.tipOverlay}
        mouseEnterDelay={0.1}
      >
        <span className={styles.icon} aria-label="更多信息">
          <ExclamationCircleOutlined />
        </span>
      </Tooltip>
    </div>
  );
}
