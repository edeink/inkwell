import { CloseOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Popover, Tooltip } from 'antd';

import styles from './index.module.less';

import type { ReactNode } from 'react';

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
        placement="bottomRight"
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
