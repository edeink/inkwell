---
title: 核心组件（Widgets）
---

本目录对应 `src/core` 的核心 Widget 组件，覆盖布局、容器、文本、滚动与视口等能力。

## 使用方式

- 代码中通常从核心入口引入：`import { Container, Row, Text } from '@/core'`
- 文档/示例代码块首行添加：`/** @jsxImportSource @/utils/compiler */`

## 组件一览

| 组件 | 用途 |
| --- | --- |
| [Container](/docs/api/widgets/Container) | 通用容器（尺寸、背景、对齐、边距等） |
| [Padding](/docs/api/widgets/Padding) | 内边距容器 |
| [Center](/docs/api/widgets/Center) | 子节点居中 |
| [SizedBox](/docs/api/widgets/SizedBox) | 固定尺寸盒子 |
| [Row](/docs/api/widgets/Row) | 水平 Flex 布局 |
| [Column](/docs/api/widgets/Column) | 垂直 Flex 布局 |
| [Expanded](/docs/api/widgets/Expanded) | Flex 子项空间分配 |
| [Wrap](/docs/api/widgets/Wrap) | 自动换行布局 |
| [Stack](/docs/api/widgets/Stack) | 层叠布局 |
| [Positioned](/docs/api/widgets/Positioned) | Stack 子项定位 |
| [Text](/docs/api/widgets/Text) | 文本渲染与测量 |
| [RichText](/docs/api/widgets/RichText) | 富文本（多段样式） |
| [Input](/docs/api/widgets/Input) | 单行输入（基于隐藏 DOM 输入捕获） |
| [TextArea](/docs/api/widgets/TextArea) | 多行输入（基于隐藏 DOM 输入捕获） |
| [ScrollView](/docs/api/widgets/ScrollView) | 滚动容器 |
| [Viewport](/docs/api/widgets/Viewport) | 视口变换（缩放/平移） |
| [Image](/docs/api/widgets/Image) | 图片绘制与 fit/alignment |
