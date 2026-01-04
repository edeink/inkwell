import { useCallback, useRef } from 'react';

import { InkwellCanvas } from '../common/inkwell-canvas';
import { DemoKey } from '../type';

import { runApp } from './app';

import Runtime from '@/runtime';

export const meta = {
  key: DemoKey.Spreadsheet,
  label: '电子表格',
  description:
    '高性能 Excel 风格表格组件。支持百万级数据虚拟滚动、稀疏矩阵存储、行列调整和公式计算。',
};

export default function SpreadsheetDemo() {
  const sizeRef = useRef({ width: 0, height: 0 });

  const handleRuntimeReady = useCallback((rt: Runtime) => {
    if (rt.container) {
      const { width, height } = rt.container.getBoundingClientRect();
      sizeRef.current = { width, height };
      runApp(rt, width, height);
    }
  }, []);

  const handleResize = useCallback((width: number, height: number, rt: Runtime) => {
    sizeRef.current = { width, height };
    runApp(rt, width, height);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <InkwellCanvas
        style={{ width: '100%', height: '100%' }}
        onRuntimeReady={handleRuntimeReady}
        onResize={handleResize}
      />
    </div>
  );
}
