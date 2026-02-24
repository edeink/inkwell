/**
 * 属性编辑器只读行组件
 *
 * 以两列布局渲染只读信息。
 * 注意事项：items 为空时不会渲染内容。
 * 潜在副作用：无。
 */
import styles from '../index.module.less';

import type { ReactNode } from 'react';

/**
 * 只读项定义
 *
 * 注意事项：key 需唯一。
 * 潜在副作用：无。
 */
export type ReadonlyItem = { key: string; label: ReactNode; value: ReactNode };

/**
 * ReadonlyRows
 *
 * @param props 只读行参数
 * @returns React 元素
 * @remarks
 * 注意事项：建议以偶数项输入以保持布局均衡。
 * 潜在副作用：无。
 */
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
