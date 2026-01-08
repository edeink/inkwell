import { useRef } from 'react';

import { InkwellCanvas } from '../common/inkwell-canvas';

import { runApp } from './app';

import type Runtime from '@/runtime';

export const meta = {
  key: 'markdown-preview',
  label: 'Markdown',
  description: '使用 Inkwell 组件库实现的 Markdown 解析和渲染演示。',
};

export default function MarkdownPreviewDemo() {
  const runtimeRef = useRef<Runtime | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  const handleRuntimeReady = (runtime: Runtime) => {
    runtimeRef.current = runtime;
    runApp(runtime, sizeRef.current.width, sizeRef.current.height);
  };

  const handleResize = (width: number, height: number, runtime: Runtime) => {
    sizeRef.current = { width, height };
    runtimeRef.current = runtime;
    runApp(runtime, width, height);
  };

  return (
    <InkwellCanvas
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      onRuntimeReady={handleRuntimeReady}
      onResize={handleResize}
    />
  );
}
