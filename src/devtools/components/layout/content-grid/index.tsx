import styles from '../index.module.less';

import type { LayoutInfo } from '..';
import type { MouseEvent, ReactNode } from 'react';

export function LayoutContentGrid({
  info,
  renderTree,
  renderProps,
  onSplitMouseDown,
}: {
  info: LayoutInfo;
  renderTree: (info: LayoutInfo) => ReactNode;
  renderProps: (info: LayoutInfo) => ReactNode;
  onSplitMouseDown: (e: MouseEvent) => void;
}) {
  return (
    <div className={styles.layoutContentGrid}>
      <div className={styles.treePane}>{renderTree(info)}</div>
      <div
        className={styles.splitHandle}
        onMouseDown={(e) => {
          e.stopPropagation();
          onSplitMouseDown(e);
        }}
      />
      <div className={styles.propsPane}>
        <div className={styles.propsPaneBody}>{renderProps(info)}</div>
      </div>
    </div>
  );
}
