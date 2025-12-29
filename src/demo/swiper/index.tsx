import { InkwellCanvas } from '../common/inkwell-canvas';

import { runApp } from './app';

export const meta = {
  key: 'swiper',
  label: '轮播图',
  description: '高性能手势轮播组件。支持惯性滑动、自动播放和无限循环。',
};

export default function SwiperDemo() {
  return <InkwellCanvas style={{ width: '100%', height: '100%' }} onRuntimeReady={runApp} />;
}
