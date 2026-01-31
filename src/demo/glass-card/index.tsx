import { useEffect, useRef } from 'react';

import { useTheme } from '../../styles/theme';
import { InkwellCanvas } from '../common/inkwell-canvas';
import { DemoKey } from '../type';

import { runApp } from './app';

import type Runtime from '@/runtime';

export const meta = {
  key: DemoKey.GlassCard,
  label: '玻璃组件',
  description: 'Canvas2D 自绘玻璃拟态组件合集：磨砂卡片、磨砂弧带日历、磨砂图表、磨砂按钮。',
};

export default function GlassCardDemo() {
  // React 侧只负责“挂载画布 + 驱动 Runtime.render”，具体 UI 由 runApp 构建
  const theme = useTheme();
  const runtimeRef = useRef<Runtime | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  // InkwellCanvas 初始化完成后回调，这里拿到 runtime 并首次渲染
  const handleRuntimeReady = (runtime: Runtime) => {
    runtimeRef.current = runtime;
    runApp(runtime, sizeRef.current.width, sizeRef.current.height, theme);
  };

  // 容器尺寸变化时重新渲染，确保 ScrollView/卡片布局与可视区域一致
  const handleResize = (width: number, height: number, runtime: Runtime) => {
    sizeRef.current = { width, height };
    runtimeRef.current = runtime;
    runApp(runtime, width, height, theme);
  };

  useEffect(() => {
    // 主题切换时重渲染整棵 demo Widget 树（主题是渲染参数的一部分）
    if (runtimeRef.current) {
      runApp(runtimeRef.current, sizeRef.current.width, sizeRef.current.height, theme);
    }
  }, [theme]);

  return (
    <InkwellCanvas
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      onRuntimeReady={handleRuntimeReady}
      onResize={handleResize}
    />
  );
}
