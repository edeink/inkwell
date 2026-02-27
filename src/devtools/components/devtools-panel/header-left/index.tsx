/**
 * Devtools 面板左侧标题区
 *
 * 提供拾取开关按钮与相关提示。
 * 注意事项：内部直接连接 Store 获取状态。
 * 潜在副作用：无。
 */
import cn from 'classnames';
import { useShallow } from 'zustand/react/shallow';

import { DEVTOOLS_PLACEMENT } from '../../../constants';
import { usePanelStore } from '../../../store';

import styles from './index.module.less';

import { Button, Tooltip } from '@/ui';
import { InspectOutlined } from '@/ui/icons';

/**
 * DevtoolsHeaderLeft
 *
 * @returns React 元素
 * @remarks
 * 注意事项：内部处理 disabled 状态逻辑。
 * 潜在副作用：无。
 */
export function DevtoolsHeaderLeft() {
  const { activeInspect, visible, runtime, toggleInspect } = usePanelStore(
    useShallow((state) => ({
      activeInspect: state.activeInspect,
      visible: state.visible,
      runtime: state.runtime,
      toggleInspect: state.toggleInspect,
    })),
  );

  const disabled = !visible || !runtime;

  return (
    <Tooltip title="Inspect" placement={DEVTOOLS_PLACEMENT.BOTTOM}>
      <Button
        type="text"
        aria-pressed={activeInspect}
        className={cn({ [styles.inspectBtnActive]: activeInspect })}
        icon={<InspectOutlined />}
        disabled={disabled}
        onClick={toggleInspect}
      />
    </Tooltip>
  );
}
