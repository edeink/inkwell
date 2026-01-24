/**
 * 文件用途：editable-text 示例的 React 外壳（Demos 面板入口）。
 * 主要功能：
 * - 通过 InkwellCanvas 创建 Runtime
 * - 在 Runtime 就绪、尺寸变化、主题变化时调用 runApp 重新渲染
 */
import { useEffect, useRef } from 'react';

import { useTheme } from '../../styles/theme';
import { InkwellCanvas } from '../common/inkwell-canvas';
import { DemoKey } from '../type';

import { runApp } from './app';

import type Runtime from '@/runtime';

export const meta = {
  key: DemoKey.EditableText,
  label: '文本编辑',
  description:
    '展示文本编辑组件（Input/TextArea）的能力，支持单行和多行编辑模式，支持光标控制、选区、剪贴板等操作。',
};

export default function EditableTextDemo() {
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
