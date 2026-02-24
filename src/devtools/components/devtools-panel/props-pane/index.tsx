/**
 * Devtools 属性面板
 *
 * 负责渲染属性编辑器并透传应用回调。
 * 注意事项：需传入当前选中 Widget。
 * 潜在副作用：触发属性更新回调。
 */
import { PropsEditor } from '../../props-editor';

import type { Widget } from '@/core/base';

/**
 * 属性面板参数
 *
 * 注意事项：widget 为空时仅展示空态。
 * 潜在副作用：无。
 */
export type DevtoolsPropsPaneProps = {
  widget: Widget | null;
  onApply: () => void;
};

/**
 * DevtoolsPropsPane
 *
 * @param props 属性面板参数
 * @returns React 元素
 * @remarks
 * 注意事项：onApply 用于触发运行时重建。
 * 潜在副作用：触发属性应用回调。
 */
export function DevtoolsPropsPane({ widget, onApply }: DevtoolsPropsPaneProps) {
  return <PropsEditor widget={widget} onChange={onApply} />;
}
