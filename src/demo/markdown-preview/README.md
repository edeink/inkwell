# Markdown Preview Demo

这是一个使用 Inkwell 渲染引擎实现的 Markdown 预览演示。

## 功能特点

*   **纯 Inkwell 实现**：不依赖任何第三方 Markdown 渲染库（如 react-markdown），也不使用 HTML/DOM 元素进行渲染。
*   **AST 解析**：实现了一个简单的 Markdown 解析器，将 Markdown 文本转换为 AST（抽象语法树）。
*   **组件化渲染**：使用 Inkwell 的 `Column`, `Row`, `Wrap`, `Text`, `Container` 等核心组件递归渲染 AST 节点。
*   **高性能滚动**：使用 `ScrollView` 组件实现平滑滚动预览，内容自动居中并适配屏幕宽度。

## 支持语法

目前支持以下基础 Markdown 语法：

*   **标题**：`# H1` 到 `###### H6`
*   **段落**：普通文本段落
*   **列表**：
    *   无序列表 (`*` 或 `-`)
    *   有序列表 (`1.`)
    *   任务列表 (`- [ ]`, `- [x]`)
*   **代码**：
    *   代码块：\`\`\`language ... \`\`\` (支持基础语法高亮)
    *   行内代码：\`code\`
*   **表格**：基础表格渲染 (`| Header |`)
*   **引用**：`> 引用文本`
*   **图片**：`![Alt](url)` (占位符展示)
*   **分割线**：`---`
*   **行内样式**：
    *   **加粗**：`**text**`
    *   **斜体**：`*text*`
    *   **链接**：`[text](url)`

## 使用方法

本 Demo 自动加载示例 Markdown 文本进行展示。

核心代码位于：
- `utils/parser.ts`: Markdown 解析器
- `widgets/markdown-viewer/`: 渲染组件
- `app.tsx`: 入口文件
