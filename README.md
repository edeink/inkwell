# Inkwell (@edeink/inkwell)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
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
