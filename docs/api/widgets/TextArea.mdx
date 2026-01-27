---
title: TextArea
---

核心用途：多行文本输入，支持换行渲染、光标垂直移动、选区拖拽与垂直滚动。

## 如何引入

- 项目代码：`import { TextArea } from '@/core'`
- 文档/示例：在代码块首行添加 `/** @jsxImportSource @/utils/compiler */`

## 示例

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <TextArea
      value={'这是第一行\n这是第二行'}
      placeholder="请输入多行内容"
      fontSize={14}
      color={theme.text.primary}
      selectionColor={theme.state.focus}
      cursorColor={theme.text.primary}
    />
  );
})()
```

## 属性

| 属性名 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `value` | 当前文本 | `string` | 无 |
| `onChange` | 文本变更回调 | `(value: string) => void` | 无 |
| `onSelectionChange` | 选区变化回调（start/end） | `(start: number, end: number) => void` | 无 |
| `onFocus` | 获取焦点回调 | `() => void` | 无 |
| `onBlur` | 失去焦点回调 | `() => void` | 无 |
| `onKeyDown` | 键盘按下回调（返回 `false` 可阻止默认行为） | `(e: InkwellEvent) => boolean \| void` | 无 |
| `readOnly` | 只读（允许选择，但不允许修改） | `boolean` | `false` |
| `disabled` | 禁用（不响应交互） | `boolean` | `false` |
| `maxLength` | 最大字符数（超出会截断） | `number` | 无 |
| `placeholder` | 占位文本（仅在空文本时显示） | `string` | 无 |
| `fontSize` | 字号 | `number` | `14` |
| `fontFamily` | 字体族 | `string` | `'Arial, sans-serif'` |
| `color` | 文本颜色 | `string` | 主题 `text.primary` |
| `selectionColor` | 选区颜色（聚焦时使用） | `string` | 主题 `state.focus` |
| `cursorColor` | 光标颜色 | `string` | 主题 `text.primary` |
| `autoFocus` | 初始化后自动聚焦 | `boolean` | `false` |

- children 支持类型：`None`

## Tips

- 命中测试为每行建立累计宽度表并二分查找，长文本拖拽选择时更稳定。
- `ArrowUp/ArrowDown` 会尽量保持光标的“视觉 X 坐标”，提升垂直移动的一致性。
