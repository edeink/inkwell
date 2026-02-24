/**
 * 属性编辑器分区容器
 *
 * 用于渲染带标题的分区块。
 * 注意事项：titleClassName/bodyClassName 会拼接到默认样式。
 * 潜在副作用：无。
 */
import styles from '../index.module.less';

import type { ReactNode } from 'react';

/**
 * Section
 *
 * @param props 分区参数
 * @returns React 元素
 * @remarks
 * 注意事项：title 需为可渲染节点。
 * 潜在副作用：无。
 */
export function Section({
  title,
  children,
  bodyClassName,
  titleClassName,
}: {
  title: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  titleClassName?: string;
}) {
  return (
    <div className={styles.section}>
      <div className={[styles.sectionTitle, titleClassName ?? ''].filter(Boolean).join(' ')}>
        {title}
      </div>
      <div className={[styles.sectionBody, bodyClassName ?? ''].filter(Boolean).join(' ')}>
        {children}
      </div>
    </div>
  );
}
