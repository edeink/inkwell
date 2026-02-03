import cn from 'classnames';

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
    <Tooltip title="Inspect" placement="bottom">
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
