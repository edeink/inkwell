import { useEffect, useRef } from 'react';

import { useTheme } from '../../styles/theme';
import { InkwellCanvas } from '../common/inkwell-canvas';

import { runApp } from './app';

import Runtime from '@/runtime';

export const meta = {
  key: 'widget-gallery',
  label: '部件画廊',
  description: '核心组件功能展示。包含布局组件(Row, Column, Stack)和基础组件的综合运用效果。',
};

export default function WidgetGalleryDemo() {
  const theme = useTheme();
  const runtimeRef = useRef<Runtime | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  const handleRuntimeReady = (runtime: Runtime) => {
    runtimeRef.current = runtime;
    runApp(runtime, sizeRef.current.width, sizeRef.current.height, theme);
  };

  const handleResize = (width: number, height: number, runtime: Runtime) => {
    sizeRef.current = { width, height };
    runtimeRef.current = runtime;
    runApp(runtime, width, height, theme);
  };

  useEffect(() => {
    if (runtimeRef.current) {
      runApp(runtimeRef.current, sizeRef.current.width, sizeRef.current.height, theme);
    }
  }, [theme]);

  return (
    <InkwellCanvas
      style={{ width: '100%', height: '100%' }}
      onRuntimeReady={handleRuntimeReady}
      onResize={handleResize}
    />
  );
}
