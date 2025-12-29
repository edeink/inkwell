import { InkwellCanvas } from '../common/inkwell-canvas';

import { runApp } from './app';

export const meta = {
  key: 'interactive-counter',
  label: '交互计数器',
  description: '基础计数器功能演示。展示了状态管理、事件响应和基本的文本/按钮渲染能力。',
};

export default function InteractiveCounterDemo() {
  return <InkwellCanvas style={{ width: '100%', height: '100%' }} onRuntimeReady={runApp} />;
}
