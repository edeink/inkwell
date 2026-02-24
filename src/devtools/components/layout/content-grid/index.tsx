/**
 * Devtools 布局内容网格
 *
 * 负责树面板与属性面板的左右布局与拖拽分割。
 * 注意事项：依赖 LayoutInfo 控制尺寸。
 * 潜在副作用：阻止鼠标事件冒泡。
 */
import { type MouseEvent } from 'react';

import { DevtoolsPropsPane } from '../../devtools-panel/props-pane';
import { DevtoolsTreePane } from '../../devtools-panel/tree-pane';
import styles from '../index.module.less';

import type { LayoutInfo } from '..';
import type { DevtoolsPropsPaneProps } from '../../devtools-panel/props-pane';
import type { DevtoolsTreePaneProps } from '../../devtools-panel/tree-pane';

/**
 * LayoutContentGrid
 *
 * @param props 布局内容参数
 * @returns React 元素
 * @remarks
 * 注意事项：onSplitMouseDown 需处理拖拽逻辑。
 * 潜在副作用：会阻止鼠标事件冒泡。
 */
export function LayoutContentGrid({
  info,
  treePaneProps,
  propsPaneProps,
  onSplitMouseDown,
}: {
  info: LayoutInfo;
  treePaneProps: Omit<DevtoolsTreePaneProps, 'info'>;
  propsPaneProps: DevtoolsPropsPaneProps;
  onSplitMouseDown: (e: MouseEvent) => void;
}) {
  return (
    <div className={styles.layoutContentGrid}>
      <div className={styles.treePane}>
        <DevtoolsTreePane info={info} {...treePaneProps} />
      </div>
      <div
        className={styles.splitHandle}
        onMouseDown={(e) => {
          e.stopPropagation();
          onSplitMouseDown(e);
        }}
      />
      <div className={styles.propsPane}>
        <div className={styles.propsPaneBody}>
          <DevtoolsPropsPane {...propsPaneProps} />
        </div>
      </div>
    </div>
  );
}
