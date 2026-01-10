import { useCallback, useEffect, useRef, useState } from 'react';

import { InkwellCanvas } from '../common/inkwell-canvas';

import { runApp } from './app';
import ErrorBoundary from './components/error-boundary';
import Minimap from './components/minimap';
import Toolbar from './components/toolbar';
import ZoomBar from './components/zoom-bar';
import { MindmapController } from './controller/index';
import { MindmapContext } from './hooks/context';
import { CustomComponentType } from './type';
import { MindMapViewport } from './widgets/mindmap-viewport';

import { findWidget } from '@/core/helper/widget-selector';
import Runtime from '@/runtime';
import { Themes } from '@/styles/theme';
import { getCurrentThemeMode, subscribeToThemeChange, type ThemeMode } from '@/styles/theme';

export const meta = {
  key: 'mindmap',
  label: '思维导图',
  description: '高性能思维导图应用演示。支持节点拖拽、缩放、编辑和无限画布功能。',
};

export default function MindmapDemo() {
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [context, setContext] = useState<MindmapController | null>(null);
  // 使用 ref 存储尺寸，避免闭包问题
  const sizeRef = useRef({ width: 0, height: 0 });
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getCurrentThemeMode());

  // 监听主题变化并重新渲染
  useEffect(() => {
    return subscribeToThemeChange((mode) => {
      setThemeMode(mode);
    });
  }, []);

  useEffect(() => {
    if (runtime && sizeRef.current.width > 0 && sizeRef.current.height > 0) {
      runApp(runtime, sizeRef.current.width, sizeRef.current.height, Themes[themeMode]);
    }
  }, [themeMode, runtime]);

  const initController = useCallback(
    (rt: Runtime) => {
      const root = rt.getRootWidget();
      const vp = findWidget<MindMapViewport>(
        root,
        CustomComponentType.MindMapViewport,
      ) as MindMapViewport | null;

      if (vp) {
        let ctrl = MindmapController.byRuntime.get(rt);
        // 如果控制器不存在或关联的 viewport 发生变化（虽然不太可能），则重新创建
        if (!ctrl || ctrl.viewport !== vp) {
          ctrl = new MindmapController(rt, vp, () => {});
          setContext(ctrl);
        } else if (!context) {
          // 如果 ctrl 存在但 context 状态未设置（例如重新挂载）
          setContext(ctrl);
        }
      }
    },
    [context],
  );

  const handleRuntimeReady = useCallback(
    (rt: Runtime) => {
      setRuntime(rt);
      // 尝试获取初始尺寸
      if (rt.container) {
        const { width, height } = rt.container.getBoundingClientRect();
        sizeRef.current = { width, height };
        runApp(rt, width, height, Themes[themeMode]);
        initController(rt);
      }
    },
    [initController, themeMode],
  );

  const handleResize = useCallback(
    (width: number, height: number, rt: Runtime) => {
      sizeRef.current = { width, height };
      runApp(rt, width, height, Themes[themeMode]);

      // 重新渲染后 Viewport 组件可能已更新，需要同步到控制器
      const ctrl = MindmapController.byRuntime.get(rt);
      if (ctrl) {
        const root = rt.getRootWidget();
        const vp = findWidget<MindMapViewport>(
          root,
          CustomComponentType.MindMapViewport,
        ) as MindMapViewport | null;
        if (vp) {
          ctrl.bindViewport(vp);
        }
      } else {
        initController(rt);
      }
    },
    [initController, themeMode],
  );

  return (
    <ErrorBoundary>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <InkwellCanvas
          style={{ width: '100%', height: '100%' }}
          onRuntimeReady={handleRuntimeReady}
          onResize={handleResize}
        />
        {runtime && context && (
          <MindmapContext.Provider value={context}>
            <Toolbar runtime={runtime} />
            <ZoomBar />
            <Minimap width={200} height={150} />
          </MindmapContext.Provider>
        )}
      </div>
    </ErrorBoundary>
  );
}
