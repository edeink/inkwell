# InkWell Demos

本项目包含 InkWell 框架的多个演示应用，展示了框架的核心功能和最佳实践。

## 目录结构规范

所有 Demo 项目均遵循统一的目录结构标准，以确保代码的可维护性和一致性。

### 1. 根目录结构

每个 Demo 的根目录下仅包含以下核心文件：

- `index.tsx`: Demo 的主入口文件，导出 Demo 组件。
- `index.module.less`: 样式文件。
- `app.tsx`: 应用主文件，通常包含 Demo 的根容器。
- `type.ts`: 类型定义文件，统一管理该 Demo 的类型。

### 2. 目录分类

代码内容严格按照以下分类存放：

- **/components**: 存放 React 组件。
- **/widgets**: 存放 InkWell 核心 Widget 组件。
- **/helpers**: 存放工具函数和辅助逻辑。
- **/constants**: 存放常量定义。
- **/hooks**: 存放自定义 React Hooks。
- **/assets**: 存放静态资源文件。

### 3. 组件组织规范

- **独占文件夹**: 每个组件（无论是 React 组件还是 InkWell Widget）必须拥有独立的文件夹。
- **命名规范**: 文件夹名称使用 kebab-case（如 `demo-button`），组件文件命名为 `index.tsx`。
- **禁止混合**: 禁止在同一个文件夹内放置多个组件，必须分文件夹存放。

## 开发准则

### 1. 命名规范

- **文件夹**: kebab-case (例如: `my-component`)
- **组件文件**: `index.tsx`
- **样式文件**: `index.module.less`
- **组件名**: PascalCase (例如: `MyComponent`)

### 2. 代码风格

- **类型安全**: 严格使用 TypeScript，避免使用 `any`。
- **样式隔离**: 使用 CSS Modules (`*.module.less`) 避免样式冲突。
- **类名管理**: 使用 `classnames` 库进行类名拼接。

### 3. 注释规范

- **语言**: 所有源代码注释、测试描述 (`it`, `describe`)、断言消息必须使用 **中文**。
- **文档**: 所有新建文档必须使用 **中文**。

## 示例项目

本项目包含以下演示应用：

1.  **interactive-counter**: 交互式计数器，展示基本的 Widget 状态管理和事件处理。
2.  **widget-gallery**: 组件展示廊，全面展示 InkWell 的核心布局和渲染能力（如 Container, Row, Column, Stack, ScrollView 等）。
3.  **mindmap**: 思维导图，展示复杂的 Canvas 交互、自定义布局引擎和高性能渲染。

## 依赖说明

- **React**: 19.x
- **TypeScript**: ~5.8
- **Less**: 样式预处理
