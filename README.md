# Inkwell (@edeink/inkwell)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/edeink/inkwell/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)

**Inkwell** is a high-performance, canvas-based UI rendering framework for React. It brings a Flutter-like declarative widget system to the web, enabling the creation of complex canvas applications like mind maps, whiteboards, and charts with the ease of React JSX.

## ✨ Core Features

- **Flutter-like Architecture**: Build UI using a tree of Widgets (`Container`, `Row`, `Column`, `Stack`, etc.).
- **High Performance**: Renders directly to HTML5 Canvas with an optimized render pipeline.
- **React Integration**: Write widgets using JSX syntax you already know.
- **Flexbox Layout**: Built-in layout engine supporting Flexbox models.
- **Event System**: robust pointer event handling (click, hover, drag) with bubbling.
- **DevTools**: Integrated debugging tools to inspect the widget tree.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 22.0.0
- pnpm

### Installation

```bash
git clone https://github.com/edeink/inkwell.git
cd inkwell
pnpm install
```

### Running the Demo

Start the Mindmap demo to see Inkwell in action:

```bash
pnpm dev
```

Visit `http://localhost:5173` (or the port shown in your terminal).

### Running Documentation

```bash
pnpm doc
```

### Running Tests

```bash
pnpm test
```

## 🏗 Project Structure

```bash
src/
├── core/           # Core framework (Widgets, Events, Pipeline)
├── renderer/       # Rendering implementations (Canvas2D)
├── utils/          # Utilities & Custom JSX Compiler
├── demo/           # Example applications (Mindmap, etc.)
├── devtools/       # Debugging overlay tools
└── benchmark/      # Performance testing
```

## 🤝 Contribution

1.  Fork the repository.
2.  Create a feature branch: `git checkout -b feature/my-feature`.
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

Please ensure you run `pnpm format` and `pnpm test` before submitting.

## 📄 License

MIT

---

# 中文说明 (Chinese Readme)

**Inkwell** 是一个基于 Canvas 的高性能 React UI 渲染框架。它将类似 Flutter 的声明式 Widget 系统引入 Web，让你能用熟悉的 React JSX 语法构建思维导图、白板和图表等复杂的 Canvas 应用。

## ✨ 核心特性

- **类 Flutter 架构**：使用 Widget 树构建 UI (`Container`, `Row`, `Column`, `Stack` 等)。
- **高性能**：拥有优化的渲染管线，直接渲染到 HTML5 Canvas。
- **React 集成**：使用你熟知的 JSX 语法编写 Widget。
- **Flexbox 布局**：内置支持 Flexbox 模型的布局引擎。
- **事件系统**：强大的指针事件处理（点击、悬停、拖拽），支持事件冒泡。
- **DevTools**：集成的调试工具，用于检查 Widget 树。

## 🚀 快速开始

### 前置要求
- Node.js >= 22.0.0
- pnpm

### 安装

```bash
git clone https://github.com/edeink/inkwell.git
cd inkwell
pnpm install
```

### 运行 Demo

启动思维导图 Demo 以查看 Inkwell 的实际效果：

```bash
pnpm dev
```

访问 `http://localhost:5173`（或终端显示的端口）。

### 运行文档

```bash
pnpm doc
```

### 运行测试

```bash
pnpm test
```

## 🏗 项目结构

```bash
src/
├── core/           # 核心框架 (Widgets, Events, Pipeline)
├── renderer/       # 渲染实现 (Canvas2D)
├── utils/          # 工具与自定义 JSX 编译器
├── demo/           # 示例应用 (Mindmap 等)
├── devtools/       # 调试覆盖工具
└── benchmark/      # 性能测试
```

## 🤝 贡献指南

1.  Fork 本仓库。
2.  创建一个特性分支：`git checkout -b feature/my-feature`。
3.  提交你的更改。
4.  推送到该分支。
5.  发起 Pull Request。

提交前请确保运行 `pnpm format` 和 `pnpm test`。

## 📄 许可证

MIT
