import { useEffect, useState } from 'react';

import { useMindmapController } from '../context';

export interface MindmapViewState {
  scale: number;
  tx: number;
  ty: number;
  scrollX: number;
  scrollY: number;
}

export function useMindmapView(): MindmapViewState {
  const controller = useMindmapController();
  const [state, setState] = useState<MindmapViewState>({
    scale: controller.viewScale,
    tx: controller.viewTx,
    ty: controller.viewTy,
    scrollX: controller.scrollX,
    scrollY: controller.scrollY,
  });

  useEffect(() => {
    // 初始同步
    setState({
      scale: controller.viewScale,
      tx: controller.viewTx,
      ty: controller.viewTy,
      scrollX: controller.scrollX,
      scrollY: controller.scrollY,
    });

    // 监听视图变更（缩放、平移 x、平移 y）
    const unsubView = controller.addViewChangeListener((scale, tx, ty) => {
      setState((prev) => ({
        ...prev,
        scale,
        tx,
        ty,
        // 同时更新内容位置，以防在没有事件的情况下发生变化（如果我们修复了控制器，这种情况不太可能发生）
        scrollX: controller.scrollX,
        scrollY: controller.scrollY,
      }));
    });

    // 我们还需要监听内容滚动变化。
    // 由于 MindmapController 现在监听 Viewport 滚动并调用 view.syncFromViewport
    // -> notifyListeners，理论上 addViewChangeListener 也应该在滚动时触发？
    // 让我们验证 ViewModule.notifyListeners 的行为。

    return () => {
      unsubView();
    };
  }, [controller]);

  return state;
}
