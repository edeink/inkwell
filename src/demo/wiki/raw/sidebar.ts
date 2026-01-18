const sidebars = {
  docs: [
    { type: 'doc', id: 'intro', label: 'Wiki 示例' },
    {
      type: 'category',
      label: '指南',
      collapsed: false,
      items: [
        { type: 'doc', id: 'guide/getting-started', label: '快速开始' },
        { type: 'doc', id: 'guide/layout', label: '布局说明' },
      ],
    },
    {
      type: 'category',
      label: '示例',
      collapsed: false,
      items: [
        { type: 'doc', id: 'sample', label: 'Markdown 语法覆盖示例' },
        { type: 'doc', id: 'sum-2025', label: '2025 总结' },
      ],
    },
    {
      type: 'category',
      label: '示例 01',
      collapsed: false,
      items: [
        { type: 'doc', id: 'test01', label: 'Wiki 示例 01' },
        { type: 'doc', id: 'test02', label: 'Wiki 示例 02' },
      ],
    },
  ],
};

export default sidebars;
