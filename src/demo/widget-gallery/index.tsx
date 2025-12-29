import { InkwellCanvas } from '../common/inkwell-canvas';

import { runApp } from './app';

import Runtime from '@/runtime';

export const meta = {
  key: 'widget-gallery',
  label: '组件画廊',
  description: '核心组件功能展示。包含布局组件(Row, Column, Stack)和基础组件的综合运用效果。',
};

export default function WidgetGalleryDemo() {
  const handleRuntimeReady = (runtime: Runtime) => {
    runApp(runtime, 0, 0);
  };

  const handleResize = (width: number, height: number, runtime: Runtime) => {
    runApp(runtime, width, height);
  };

  return (
    <InkwellCanvas
      style={{ width: '100%', height: '100%' }}
      onRuntimeReady={handleRuntimeReady}
      onResize={handleResize}
    />
  );
}
