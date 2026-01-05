import { useEffect, useRef } from 'react';

import { useTheme } from '../../styles/theme';
import { InkwellCanvas } from '../common/inkwell-canvas';
import { DemoKey } from '../type';

import { runApp } from './app';

import type Runtime from '@/runtime';

export const meta = {
  key: DemoKey.Swiper,
  label: '轮播图',
  description: '高性能手势轮播组件。支持惯性滑动、自动播放和无限循环。',
};

export default function SwiperDemo() {
  const theme = useTheme();
  const runtimeRef = useRef<Runtime | null>(null);

  const handleRuntimeReady = (runtime: Runtime) => {
    runtimeRef.current = runtime;
    runApp(runtime, theme);
  };

  useEffect(() => {
    if (runtimeRef.current) {
      runApp(runtimeRef.current, theme);
    }
  }, [theme]);

  return (
    <InkwellCanvas style={{ width: '100%', height: '100%' }} onRuntimeReady={handleRuntimeReady} />
  );
}
