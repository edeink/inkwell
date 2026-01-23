import { useEffect, useRef } from 'react';

import { InkwellCanvas } from '../common/inkwell-canvas';
import { DemoKey } from '../type';

import { runApp } from './app';

import type Runtime from '@/runtime';

import { useTheme } from '@/styles/theme';

export const meta = {
  key: DemoKey.Wiki,
  label: 'Wiki',
  description: '基于 Inkwell 的多文档 Markdown Wiki。',
};

export default function WikiDemo() {
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
      padding={0}
    />
  );
}
