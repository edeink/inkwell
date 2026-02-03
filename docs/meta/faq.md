---
id: faq
title: 常见问题
sidebar_position: 1
---

# 常见问题

本文档汇总了在使用 Inkwell 框架开发过程中可能遇到的典型问题及解决方案。

## 概念与原理

### Q: Inkwell 与 React DOM 有什么区别？
**A**: Inkwell 是一个 Canvas 渲染引擎，它使用 React 作为 DSL (领域特定语言) 来描述 UI，但不使用 React DOM 或 HTML 元素。这使得它在处理大量图形节点（如思维导图、图表）时具有更高的性能。

### Q: 支持 CSS 吗？
**A**: 不支持传统的 CSS。Inkwell 使用类似 Flutter 的样式对象和 Flex 布局模型。

### Q: 如何处理文本渲染？
**A**: Inkwell 内部实现了轻量级的文本布局引擎，支持基本的换行和对齐。

## 基础使用

### Q: 为什么我的组件没有显示？
**A**: 请检查以下几点：
1.  **尺寸约束**：父组件是否提供了有效的尺寸约束？如果父组件是 `unbounded`（如 `Row` 的水平方向），子组件必须有明确宽度。
2.  **绘制方法**：如果是自定义 Widget，确保 `paintSelf/performLayout` 等核心方法已按契约实现。
3.  **层级关系**：检查 `z-index` 或绘制顺序，可能被其他组件覆盖。

### Q: 如何给组件添加点击事件？
```tsx
  <Container color="blue" width={100} height={100} onClick={() => console.log('点击 Container')} />
```
注意：组件需要具备有效的布局尺寸（`width/height` 或可推导出的 size），并处于可命中的区域内；事件会通过命中测试找到目标节点并按捕获/冒泡阶段分发。

## 布局与样式

### Q: `Row` 或 `Column` 内容溢出怎么办？
**A**: 
1.  使用 `Expanded` 包裹子组件，使其按 `flex` 分配剩余空间（必要时给子组件明确尺寸）。
2.  如果内容确实超出屏幕，考虑使用 `ScrollView` 包裹内容区域。

### Q: 如何实现绝对定位？
**A**: 使用 `Stack` + `Positioned` 组合：
```tsx
<Stack>
  <Container width={200} height={200} color="red" />
  <Positioned left={10} top={10}>
    <Text text="Overlay" />
  </Positioned>
</Stack>
```

## 性能优化

### Q: 界面卡顿如何排查？
**A**:
1.  **减少重绘**：避免在 `paint` 方法中创建新对象（如 `Paint`、`Path`）。
2.  **局部更新**：使用 `RepaintBoundary` 隔离频繁变化的区域。
3.  **DevTools**：使用 Inkwell DevTools 查看渲染树和重绘区域。

### Q: 为什么 `setState` 后没有更新？
**A**:
1.  检查 `setState` 是否在组件挂载（Mounted）后调用。
2.  确认修改的状态变量是否真的发生了变化（浅比较）。
3.  如果是引用类型（对象/数组），请确保创建了新引用而不是修改原对象。

## 调试

### Q: 如何查看组件树结构？
**A**: 
1.  使用 Inkwell DevTools (参阅 [开发者工具](../advanced/devtools))。
