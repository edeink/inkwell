---
title: Ink Design（UI 组件）
---

Ink Design 是一组面向 Canvas 场景的 UI 组件集合，对应源码目录为 `src/comp`，通过 Widget 系统实现常用交互控件与表单能力，便于在 Demo/编辑器覆盖层等场景快速搭建界面。

## 如何引入

- 统一入口：`import { Button, Select, Table, Modal } from '@/comp'`
- 文档/示例代码块：首行添加 `/** @jsxImportSource @/utils/compiler */`

## 设计约定

- 主题：大部分组件支持 `theme?: ThemePalette`，未传入时按当前主题模式取值
- 事件：交互回调统一使用 Inkwell 事件类型（例如 `onClick(e: InkwellEvent)`）
- 子节点：优先使用 `Text` 等 Widget 作为内容，必要时对文本类子元素设置 `pointerEvent="none"` 避免命中落在子节点上

## 组件一览

| 组件 | 用途 |
| --- | --- |
| [Button](/docs/api/comp/Button) | 通用按钮，支持类型/尺寸/禁用/加载态 |
| [Checkbox](/docs/api/comp/Checkbox) | 多选项开关 |
| [CheckboxGroup](/docs/api/comp/CheckboxGroup) | 复选框组 |
| [Radio](/docs/api/comp/Radio) | 单选项 |
| [RadioGroup](/docs/api/comp/RadioGroup) | 单选组 |
| [Select](/docs/api/comp/Select) | 选择器（下拉列表） |
| [DatePicker](/docs/api/comp/DatePicker) | 日期选择器 |
| [Form](/docs/api/comp/Form) | 表单容器与校验编排 |
| [FormItem](/docs/api/comp/FormItem) | 表单项，承载 label/校验/布局 |
| [Menu](/docs/api/comp/Menu) | 菜单与选中态管理 |
| [Message](/docs/api/comp/Message) | 全局提示消息（轻量反馈） |
| [Modal](/docs/api/comp/Modal) | 模态弹窗 |
| [Drawer](/docs/api/comp/Drawer) | 抽屉面板 |
| [Popconfirm](/docs/api/comp/Popconfirm) | 二次确认弹层 |
| [Table](/docs/api/comp/Table) | 表格展示（含基础交互与布局） |
| [Pagination](/docs/api/comp/Pagination) | 分页器 |
