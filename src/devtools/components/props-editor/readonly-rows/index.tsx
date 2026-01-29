import styles from '../index.module.less';

import type { ReactNode } from 'react';

export type ReadonlyItem = { key: string; label: ReactNode; value: ReactNode };

export function ReadonlyRows({ items }: { items: ReadonlyItem[] }) {
  const rows: ReactNode[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const pair = items.slice(i, i + 2);
    rows.push(
      <div key={`row-${i}`} className={styles.readonlyGroup}>
        {pair.map((item) => (
          <div key={item.key} className={styles.readonlyItem}>
            <span className={styles.readonlyLabel}>{item.label}</span>
            <span className={styles.readonlyValue}>{item.value}</span>
          </div>
        ))}
      </div>,
    );
  }
  return <>{rows}</>;
}
