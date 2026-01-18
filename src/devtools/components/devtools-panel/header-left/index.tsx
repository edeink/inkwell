import { AimOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import cn from 'classnames';

import styles from './index.module.less';

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
        icon={<AimOutlined />}
        onClick={onToggleInspect}
      />
    </Tooltip>
  );
}
