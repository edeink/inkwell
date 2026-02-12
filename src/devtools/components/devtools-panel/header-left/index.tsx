import cn from 'classnames';

import { DEVTOOLS_PLACEMENT, DEVTOOLS_TOOLTIP } from '../../../constants';

import styles from './index.module.less';

import { Button, Tooltip } from '@/ui';
import { InspectOutlined } from '@/ui/icons';

export function DevtoolsHeaderLeft({
  activeInspect,
  onToggleInspect,
}: {
  activeInspect: boolean;
  onToggleInspect: () => void;
}) {
  return (
    <Tooltip title={DEVTOOLS_TOOLTIP.INSPECT} placement={DEVTOOLS_PLACEMENT.BOTTOM}>
      <Button
        type="text"
        aria-pressed={activeInspect}
        className={cn({ [styles.inspectBtnActive]: activeInspect })}
        icon={<InspectOutlined />}
        onClick={onToggleInspect}
      />
    </Tooltip>
  );
}
