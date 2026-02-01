import cn from 'classnames';

import styles from './index.module.less';

import { Button, Tooltip } from '@/ui';
import { EyeOutlined } from '@/ui/icons';

export function DevtoolsHeaderLeft({
  activeInspect,
  onToggleInspect,
}: {
  activeInspect: boolean;
  onToggleInspect: () => void;
}) {
  return (
    <Tooltip title="拾取" placement="bottom">
      <Button
        type="text"
        aria-pressed={activeInspect}
        className={cn({ [styles.inspectBtnActive]: activeInspect })}
        icon={<EyeOutlined />}
        onClick={onToggleInspect}
      />
    </Tooltip>
  );
}
