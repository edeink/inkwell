import styles from './index.module.less';

import type { ReactNode } from 'react';

import { Button, Popover, Tooltip } from '@/ui';
import { CloseOutlined, QuestionCircleOutlined } from '@/ui/icons';

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
        trigger="click"
        placement="bottom"
        overlayClassName={styles.helpOverlay}
        content={helpContent}
      >
        <Tooltip title="帮助" placement="bottom">
          <Button type="text" icon={<QuestionCircleOutlined />} />
        </Tooltip>
      </Popover>
      <Tooltip title="关闭" placement="bottom">
        <Button type="text" icon={<CloseOutlined />} onClick={onRequestClose} />
      </Tooltip>
    </>
  );
}
