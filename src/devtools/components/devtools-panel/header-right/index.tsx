/**
 * Devtools 面板右侧标题区
 *
 * 提供帮助面板与关闭按钮。
 * 注意事项：需要外部传入关闭回调与帮助内容。
 * 潜在副作用：无。
 */
import { DEVTOOLS_DOM_EVENTS, DEVTOOLS_PLACEMENT } from '../../../constants';

import styles from './index.module.less';

import type { ReactNode } from 'react';

import { Button, Popover, Tooltip } from '@/ui';
import { CloseOutlined, QuestionCircleOutlined } from '@/ui/icons';

/**
 * DevtoolsHeaderRight
 *
 * @param props 组件属性
 * @returns React 元素
 * @remarks
 * 注意事项：关闭回调应负责隐藏面板。
 * 潜在副作用：无。
 */
export function DevtoolsHeaderRight({
  helpContent,
  onRequestClose,
}: {
  helpContent: ReactNode;
  onRequestClose: () => void;
}) {
  return (
    <>
      <Popover
        trigger={DEVTOOLS_DOM_EVENTS.CLICK}
        placement={DEVTOOLS_PLACEMENT.BOTTOM}
        overlayClassName={styles.helpOverlay}
        content={helpContent}
      >
        <Tooltip title="帮助" placement={DEVTOOLS_PLACEMENT.BOTTOM}>
          <Button type="text" icon={<QuestionCircleOutlined />} />
        </Tooltip>
      </Popover>
      <Tooltip title="关闭" placement={DEVTOOLS_PLACEMENT.BOTTOM}>
        <Button type="text" icon={<CloseOutlined />} onClick={onRequestClose} />
      </Tooltip>
    </>
  );
}
