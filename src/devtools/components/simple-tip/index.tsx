/**
 * 简易提示组件
 *
 * 用于在文本旁展示提示图标与悬浮提示。
 * 注意事项：message 需提供可渲染内容。
 * 潜在副作用：无。
 */
import React from 'react';

import { DEVTOOLS_PLACEMENT } from '../../constants';

import styles from './index.module.less';

import { Tooltip } from '@/ui';
import { ExclamationCircleOutlined } from '@/ui/icons';

/**
 * SimpleTipProps
 *
 * 注意事项：style/className 仅影响外层容器。
 * 潜在副作用：无。
 */
export interface SimpleTipProps {
  message: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SimpleTip
 *
 * @param props 组件参数
 * @returns React 元素
 * @remarks
 * 注意事项：Tooltip 内容与 message 保持一致。
 * 潜在副作用：无。
 */
export default function SimpleTip({ message, className, style }: SimpleTipProps) {
  return (
    <div className={[styles.simpleTip, className ?? ''].join(' ').trim()} style={style}>
      <span className={styles.text}>{message}</span>
      <Tooltip title={message} placement={DEVTOOLS_PLACEMENT.TOP}>
        <span className={styles.icon} aria-label="更多信息">
          <ExclamationCircleOutlined />
        </span>
      </Tooltip>
    </div>
  );
}
