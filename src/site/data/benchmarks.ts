export interface BenchmarkCase {
  id: string;
  company: string;
  project: string;
  description: string;
  metrics: {
    label: string;
    value: string;
    improvement?: string;
    note?: string;
  }[];
  source: {
    title: string;
    url: string;
    type: 'official_docs' | 'tech_blog' | 'conference';
  };
}

export const industryBenchmarks: BenchmarkCase[] = [
  {
    id: 'tencent-pag',
    company: '腾讯',
    project: 'PAG (Portable Animated Graphics)',
    description: '通过移除 DOM，直接在 Native 层通过 JS 绑定调用图形库，处理复杂的礼物特效和 UI。',
    metrics: [
      {
        label: '帧率',
        value: '60fps',
        improvement: '从 30-40fps 提升至满帧',
        note: '复杂动效场景',
      },
      { label: '内存', value: '-50%', improvement: '相比 WebView 方案', note: '同等复杂度下' },
      { label: '启动速度', value: '+30%', improvement: '消除 HTML/CSS 解析', note: '秒开率提升' },
    ],
    source: {
      title: 'PAG 官方文档',
      url: 'https://pag.io/', // 示例链接
      type: 'official_docs',
    },
  },
  {
    id: 'kuaishou-kwaijs',
    company: '快手',
    project: 'KwaiJS',
    description: '剔除 DOM 的轻量级 Web 渲染引擎，仅保留 JS 引擎和自研 Canvas 指令集。',
    metrics: [
      { label: '包体积', value: '5-8MB', improvement: '对比 Chromium (40-60MB)', note: '显著降低' },
      { label: '首帧耗时', value: '-40%', improvement: '比标准 WebView 快', note: 'TTI 优化' },
    ],
    source: {
      title: '快手大前端技术分享',
      url: 'https://github.com/kwai', // 占位链接
      type: 'conference',
    },
  },
  {
    id: 'alibaba-kraken',
    company: '阿里',
    project: 'Kraken (Northstar)',
    description: '基于 Flutter 的 Web 标准渲染引擎，核心思想是“去 DOM 树化”。',
    metrics: [
      { label: '滚动 FPS', value: '+20%', improvement: '稳定性提升', note: '长列表场景' },
      { label: '内存占用', value: '-40%', improvement: '减少节点属性开销', note: '复杂页面' },
    ],
    source: {
      title: 'Open Kraken 官网',
      url: 'https://openkraken.com/',
      type: 'official_docs',
    },
  },
  {
    id: 'wpe-webkit',
    company: '通用/嵌入式',
    project: 'WPE WebKit',
    description: '极度精简 WebKit，移除冗余 UI 层，直接输出到后端。',
    metrics: [
      { label: '冷启动', value: '<1.5s', improvement: '压缩至 1.5s 以内', note: '原声 3-5s' },
      { label: '动态库体积', value: '~15MB', improvement: '高度裁剪后', note: '适合低端设备' },
    ],
    source: {
      title: 'WPE WebKit 官网',
      url: 'https://wpewebkit.org/',
      type: 'official_docs',
    },
  },
];

export const performanceDisclaimer = `
* 声明：以上数据来源于各项目官方文档或技术分享，仅供参考。`;
