import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { InkwellCanvas } from '../common/inkwell-canvas';
import { DemoKey } from '../type';

import { runApp } from './app';
import { SpreadsheetToolbar } from './components/spreadsheet-toolbar';
import { SpreadsheetModel } from './spreadsheet-model';
import { DEFAULT_CONFIG } from './types';

import Runtime from '@/runtime';
import { useTheme } from '@/styles/theme';

export const meta = {
  key: DemoKey.Spreadsheet,
  label: '电子表格',
  description: '高性能 Excel 风格表格组件。支持百万级数据虚拟滚动、稀疏矩阵存储、行列调整。',
};

export default function SpreadsheetDemo() {
  const theme = useTheme();
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const [dataVersion, setDataVersion] = useState(0);

  const model = useMemo(() => {
    const m = new SpreadsheetModel({
      ...DEFAULT_CONFIG,
    });
    // 初始化一些数据
    m.setCell(0, 0, { value: 'Item' });
    m.setCell(0, 1, { value: 'Cost' });
    m.setCell(0, 2, { value: 'Price' });
    m.setCell(1, 0, { value: 'Apple' });
    m.setCell(1, 1, { value: '1.50' });
    m.setCell(1, 2, { value: '3.00' });
    m.setCell(2, 0, { value: 'Banana' });
    m.setCell(2, 1, { value: '0.50' });
    m.setCell(2, 2, { value: '1.00' });
    return m;
  }, []);

  useEffect(() => {
    if (runtime && sizeRef.current.width > 0 && sizeRef.current.height > 0) {
      runApp(runtime, sizeRef.current.width, sizeRef.current.height, theme, model, dataVersion);
    }
  }, [theme, runtime, model, dataVersion]);

  const handleRuntimeReady = useCallback(
    (rt: Runtime) => {
      setRuntime(rt);
      if (rt.container) {
        const { width, height } = rt.container.getBoundingClientRect();
        sizeRef.current = { width, height };
        runApp(rt, width, height, theme, model, dataVersion);
      }
    },
    [theme, model, dataVersion],
  );

  const handleResize = useCallback(
    (width: number, height: number, rt: Runtime) => {
      sizeRef.current = { width, height };
      runApp(rt, width, height, theme, model, dataVersion);
    },
    [theme, model, dataVersion],
  );

  const handleUpdateData = useCallback(() => {
    // 随机更新一些单元格
    for (let i = 1; i < 10; i++) {
      const cost = (Math.random() * 5).toFixed(2);
      const price = (parseFloat(cost) * 2).toFixed(2);
      model.setCell(i, 1, { value: cost });
      model.setCell(i, 2, { value: price });
    }
    setDataVersion((v) => v + 1);
  }, [model]);

  const handleAddRow = useCallback(() => {
    console.time('Generate Data');
    // 生成 10,000 行数据测试无限滚动和稀疏矩阵性能
    for (let i = 0; i < 10000; i++) {
      const row = i + 10;
      model.setCell(row, 0, { value: `Row ${row}` });
      model.setCell(row, 1, { value: (Math.random() * 100).toFixed(2) });
      model.setCell(row, 2, { value: (Math.random() * 200).toFixed(2) });
    }
    console.timeEnd('Generate Data');
    setDataVersion((v) => v + 1);
  }, [model]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      {/* React Toolbar */}
      <SpreadsheetToolbar onUpdateData={handleUpdateData} onAddRow={handleAddRow} />

      {/* Inkwell Canvas */}
      <InkwellCanvas
        style={{ width: '100%', height: '100%' }}
        onRuntimeReady={handleRuntimeReady}
        onResize={handleResize}
      />
    </div>
  );
}
