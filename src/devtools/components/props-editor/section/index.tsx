import styles from '../index.module.less';

import type { ReactNode } from 'react';

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
