---
title: Pagination
---

核心用途：分页器。支持受控（`current`）与非受控（`defaultCurrent`）两种模式，自动计算总页数并提供上一页/下一页与省略号展示。

## 如何引入

- 项目代码：`import { Pagination } from '@/comp'`
- 文档/示例：在代码块首行添加 `/** @jsxImportSource @/utils/compiler */`

## 示例

### 非受控（默认页）

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
<Stack allowOverflowPositioned={true}>
  <Container
    width={520}
    height={140}
    color={getCurrentTheme().background.container}
    border={{ width: 1, color: getCurrentTheme().border.secondary }}
    borderRadius={8}
  />
  <Positioned left={16} top={16}>
    <Pagination
      total={235}
      pageSize={10}
      defaultCurrent={3}
      onChange={(p) => console.log(`切换到第 ${p} 页`)}
    />
  </Positioned>
</Stack>
```

## 属性

| 属性名 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `total` | 数据总条数 | `number` | 无 |
| `pageSize` | 每页条数 | `number` | `10` |
| `current` | 受控当前页 | `number` | 无 |
| `defaultCurrent` | 非受控默认页 | `number` | `1` |
| `size` | 尺寸 | `'small' \| 'middle' \| 'large'` | `'middle'` |
| `theme` | 主题（可选） | `ThemePalette` | 当前主题模式 |
| `onChange` | 切页回调 | `(page: number) => void` | 无 |

## Tips

- 受控模式下传入 `current` 时，需要在外部更新 `current` 才会反映 UI 变化。
