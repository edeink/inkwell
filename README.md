# Inkwell (@edeink/inkwell)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/edeink/inkwell/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)

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

访问 `http://localhost:3001`，Playground 入口统一为 `/docs/demo/`。

### 运行测试

```bash
pnpm test
```

## 🏗 项目结构

```bash
src/
├── core/           # 核心框架（Widgets、事件、渲染流水线）
├── renderer/       # 渲染实现（Canvas2D 等）
├── utils/          # 工具与自定义 JSX 编译器
├── demo/           # 示例应用（Mindmap 等）
├── devtools/       # 调试覆盖工具
└── benchmark/      # 性能基准测试
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
