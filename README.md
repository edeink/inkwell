# @edeink/inkwell

十年功力汇聚一处。

1. 能支持多种编辑器类型，如 figma-like、notion-like 等。
2. 实现排版和绘制

## 代码结构

以下目录结构由 gemini 生产，后续再改

```shell
src/
├── core/
├── components/
├── renderer/
├── editors/
├── utils/
├── types/
└── index.ts
```

- core/: 存放项目的核心逻辑。例如，排版计算引擎、事件处理、状态管理等最底层的代码。
- components/: 存放基础的、可复用的排版组件。例如，Text（文本）、Image（图片）、Shape（形状）等。这些组件是使用 JSX 进行排版的基础元素。
- renderer/: 存放渲染相关的代码。这可能是项目最核心的部分之一，负责将虚拟 DOM（或类似的中间数据结构）转换为实际的画布绘制指令（例如，canvas 或 svg）。
- editors/: 存放不同编辑器实现的示例或基础代码。这里可以分别创建 figma-like 和 notion-like 文件夹，用于演示如何基于核心库构建不同类型的编辑器。
- utils/: 存放各种辅助函数，如数学计算、坐标转换、数据格式化等。
- types/: 存放 TypeScript 类型定义文件，用于增强代码的可维护性和可读性。
- index.ts: 项目的入口文件，负责导出核心模块和组件，供外部使用。
