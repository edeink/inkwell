import { DEVTOOLS_PLACEMENT, DEVTOOLS_TOOLTIP, DEVTOOLS_TRIGGER } from '../../../constants';

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
        trigger={DEVTOOLS_TRIGGER.CLICK}
        placement={DEVTOOLS_PLACEMENT.BOTTOM}
        overlayClassName={styles.helpOverlay}
        content={helpContent}
      >
        <Tooltip title={DEVTOOLS_TOOLTIP.HELP} placement={DEVTOOLS_PLACEMENT.BOTTOM}>
          <Button type="text" icon={<QuestionCircleOutlined />} />
        </Tooltip>
      </Popover>
      <Tooltip title={DEVTOOLS_TOOLTIP.CLOSE} placement={DEVTOOLS_PLACEMENT.BOTTOM}>
        <Button type="text" icon={<CloseOutlined />} onClick={onRequestClose} />
      </Tooltip>
    </>
  );
}
