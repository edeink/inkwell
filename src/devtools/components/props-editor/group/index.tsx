import styles from '../index.module.less';

import type { ReactNode } from 'react';

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
