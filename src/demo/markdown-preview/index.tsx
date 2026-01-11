import { useEffect, useRef } from 'react';

import { InkwellCanvas } from '../common/inkwell-canvas';

import { runApp } from './app';

import type Runtime from '@/runtime';

import { useTheme } from '@/styles/theme';

export const meta = {
  key: 'markdown-preview',
  label: 'Markdown',
  description: '使用 Inkwell 组件库实现的 Markdown 解析和渲染演示。',
};

export default function MarkdownPreviewDemo() {
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
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      onRuntimeReady={handleRuntimeReady}
      onResize={handleResize}
    />
  );
}
