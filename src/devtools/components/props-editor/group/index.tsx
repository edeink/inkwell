/**
 * 属性编辑器分组容器
 *
 * 用于渲染带标题的分组块。
 * 注意事项：bodyClassName 会拼接到默认样式。
 * 潜在副作用：无。
 */
import styles from '../index.module.less';

import type { ReactNode } from 'react';

/**
 * Group
 *
 * @param props 分组参数
 * @returns React 元素
 * @remarks
 * 注意事项：title 需为可渲染节点。
 * 潜在副作用：无。
 */
export function Group({
  title,
  children,
  bodyClassName,
}: {
  title: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <div className={styles.group}>
      <div className={styles.groupTitle}>{title}</div>
      <div className={[styles.groupBody, bodyClassName ?? ''].filter(Boolean).join(' ')}>
        {children}
      </div>
    </div>
  );
}
