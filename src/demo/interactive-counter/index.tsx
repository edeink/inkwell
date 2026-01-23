import { useEffect, useRef } from 'react';

import { useTheme } from '../../styles/theme';
import { InkwellCanvas } from '../common/inkwell-canvas';

import { runApp } from './app';

import type Runtime from '@/runtime';

export const meta = {
  key: 'interactive-counter',
  label: '交互计数器',
  description: '基础计数器功能演示。展示了状态管理、事件响应和基本的文本/按钮渲染能力。',
};

export default function InteractiveCounterDemo() {
  const theme = useTheme();
  const runtimeRef = useRef<Runtime | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  const handleRuntimeReady = (runtime: Runtime) => {
    runtimeRef.current = runtime;
    runApp(runtime, sizeRef.current.width, sizeRef.current.height, theme);
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
      onResize={(width: number, height: number, runtime: Runtime) => {
        sizeRef.current = { width, height };
        runtimeRef.current = runtime;
        runApp(runtime, width, height, theme);
      }}
    />
  );
}
