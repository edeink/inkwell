/**
 * Devtools 面板左侧标题区
 *
 * 提供拾取开关按钮与相关提示。
 * 注意事项：需要外部传入拾取状态与回调。
 * 潜在副作用：无。
 */
import cn from 'classnames';

import { DEVTOOLS_PLACEMENT, DEVTOOLS_TOOLTIP } from '../../../constants';

import styles from './index.module.less';

import { Button, Tooltip } from '@/ui';
import { InspectOutlined } from '@/ui/icons';

/**
 * DevtoolsHeaderLeft
 *
 * @param props 组件属性
 * @returns React 元素
 * @remarks
 * 注意事项：disabled 时不触发拾取切换。
 * 潜在副作用：无。
 */
export function DevtoolsHeaderLeft({
  activeInspect,
  disabled,
  onToggleInspect,
}: {
  activeInspect: boolean;
  disabled?: boolean;
  onToggleInspect: () => void;
}) {
  return (
    <Tooltip title={DEVTOOLS_TOOLTIP.INSPECT} placement={DEVTOOLS_PLACEMENT.BOTTOM}>
      <Button
        type="text"
        aria-pressed={activeInspect}
        className={cn({ [styles.inspectBtnActive]: activeInspect })}
        icon={<InspectOutlined />}
        disabled={disabled}
        onClick={onToggleInspect}
      />
    </Tooltip>
  );
}
