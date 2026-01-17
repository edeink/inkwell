# Wiki Demo

## 目标

用 Inkwell 实现一个“多篇 Markdown 文档 + 左侧目录树 + 右侧文章与标题目录”的 Wiki Demo。

## 目录结构

- `index.tsx`：React 容器入口，负责创建 Canvas 并在运行时就绪后启动 Inkwell 应用
- `app.tsx`：Inkwell 入口，负责加载 `raw` 下的 Markdown，并渲染 Wiki 主组件
- `raw/`：所有 Markdown 原始文件（支持多级目录）
- `widgets/`：所有 Inkwell Widget 组件实现

## 关键组件

- `widgets/wiki-app`：整体布局与状态聚合（当前文档、左栏宽度）
- `widgets/wiki-sidebar`：左侧文档树（支持展开/收起、选中高亮）
- `widgets/wiki-content`：右侧内容区域（复用 Markdown 预览组件并开启标题目录）
- `widgets/split-divider`：可拖拽分割线（约束左栏最小/最大宽度）
- `widgets/fstate-widget`：本 Demo 内部的状态组件基类，用于统一 state 初始化方式

## 后续开发约定

- 新增文档：只允许在 `raw/` 下新增或调整 Markdown 文件，代码侧不需要手动注册
- 文档标题：建议每篇文档第一行使用 `#` 作为标题，左侧树默认读取该标题作为展示文本
- 目录树规则：目录层级来自文件路径，建议使用短路径与稳定命名，避免频繁改动导致链接失效
- 扩展能力：如需支持“上一页/下一页”、“搜索”、“面包屑”、“最近访问”等功能，优先在 `widgets/wiki-app` 聚合状态并下发到子组件

