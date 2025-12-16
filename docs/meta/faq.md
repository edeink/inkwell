---
id: faq
title: 常见问题
sidebar_position: 1
---

# 常见问题 (FAQ)

## Inkwell 与 React DOM 有什么区别？
Inkwell 是一个 Canvas 渲染引擎，它使用 React 作为 DSL (领域特定语言) 来描述 UI，但不使用 React DOM 或 HTML 元素。这使得它在处理大量图形节点（如思维导图、图表）时具有更高的性能。

## 如何处理文本渲染？
Inkwell 内部实现了轻量级的文本布局引擎，支持基本的换行和对齐。

## 支持 CSS 吗？
不支持传统的 CSS。Inkwell 使用类似 Flutter 的样式对象和 Flex 布局模型。

## 如何调试？
请参阅 [开发者工具](/docs/advanced/devtools) 章节。
