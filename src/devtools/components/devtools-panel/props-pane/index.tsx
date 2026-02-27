/**
 * Devtools 属性面板
 *
 * 负责渲染属性编辑器并透传应用回调。
 * 注意事项：内部直接连接 Store 获取选中 Widget。
 * 潜在副作用：触发属性更新回调。
 */
import { useShallow } from 'zustand/react/shallow';

import { usePanelStore } from '../../../store';
import { PropsEditor } from '../../props-editor';

/**
 * DevtoolsPropsPane
 *
 * @returns React 元素
 * @remarks
 * 注意事项：onApply 用于触发运行时重建。
 * 潜在副作用：触发属性应用回调。
 */
export function DevtoolsPropsPane() {
  const { selectedNodeKey, treeBuild, runtime } = usePanelStore(
    useShallow((state) => ({
      selectedNodeKey: state.selectedNodeKey,
      treeBuild: state.treeBuild,
      runtime: state.runtime,
    })),
  );

  const widget = selectedNodeKey ? treeBuild.widgetByNodeKey.get(selectedNodeKey) || null : null;

  const handleApply = () => {
    runtime?.rebuild();
  };

  return <PropsEditor widget={widget} onChange={handleApply} />;
}
