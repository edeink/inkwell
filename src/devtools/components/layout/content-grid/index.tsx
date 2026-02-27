/**
 * Devtools 布局内容网格
 *
 * 负责树面板与属性面板的左右布局与拖拽分割。
 * 注意事项：依赖 LayoutInfo 控制尺寸。
 * 潜在副作用：阻止鼠标事件冒泡。
 */
import { type MouseEvent, type ReactNode } from 'react';

import styles from '../index.module.less';

/**
 * LayoutContentGrid
 *
 * @returns React 元素
 * @remarks
 * 注意事项：onSplitMouseDown 需处理拖拽逻辑。
 * 潜在副作用：会阻止鼠标事件冒泡。
 */
export function LayoutContentGrid({
  treePane,
  propsPane,
  onSplitMouseDown,
}: {
  treePane: ReactNode;
  propsPane: ReactNode;
  onSplitMouseDown: (e: MouseEvent) => void;
}) {
  return (
    <div className={styles.layoutContentGrid}>
      <div className={styles.treePane}>{treePane}</div>
      <div
        className={styles.splitHandle}
        onMouseDown={(e) => {
          e.stopPropagation();
          onSplitMouseDown(e);
        }}
      />
      <div className={styles.propsPane}>
        <div className={styles.propsPaneBody}>{propsPane}</div>
      </div>
    </div>
  );
}
