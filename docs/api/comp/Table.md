---
title: Table
---

核心用途：表格展示。支持列宽配置、行 hover 高亮、单元格自定义渲染（文本或任意 Widget）。

## 如何引入

- 项目代码：`import { Table } from '@/comp'`
- 文档/示例：在代码块首行添加 `/** @jsxImportSource @/utils/compiler */`

## 示例

### 表头不吸附（affixHeader=false）

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  return (
    <Table
      width={520}
      height={300}
      affixHeader={false}
      columns={[
        { title: '姓名', dataIndex: 'name', key: 'name', width: 160 },
        { title: '年龄', dataIndex: 'age', key: 'age', width: 120 },
        {
          title: '状态',
          dataIndex: 'status',
          key: 'status',
          width: 200,
          render: (v) => {
            const ok = v === '正常';
            const statusColor = ok ? theme.success : theme.danger;
            return (
              <Container
                padding={{ left: 8, right: 8, top: 4, bottom: 4 }}
                borderRadius={6}
                color={theme.background.container}
                border={{ width: 1, color: statusColor }}
              >
                <Text
                  text={String(v ?? '')}
                  fontSize={12}
                  color={statusColor}
                  pointerEvent="none"
                />
              </Container>
            );
          },
        },
      ]}
      dataSource={Array.from({ length: 24 }).map((_, i) => ({
        key: `u${i + 1}`,
        name: i % 2 === 0 ? '张三' : '李四',
        age: 18 + (i % 20),
        status: i % 3 === 0 ? '异常' : '正常',
      }))}
    />
  );
})()
```

### 固定表头与固定列（多个吸附）

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
<Table
  width={720}
  height={300}
  affixHeader={true}
  columns={[
    { title: '姓名', dataIndex: 'name', key: 'name', width: 140, fixed: 'left' },
    { title: '年龄', dataIndex: 'age', key: 'age', width: 100, fixed: 'left' },
    { title: '城市', dataIndex: 'city', key: 'city', width: 140 },
    { title: '电话', dataIndex: 'phone', key: 'phone', width: 180 },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 220 },
    { title: '地址', dataIndex: 'address', key: 'address', width: 240 },
    { title: '操作', key: 'action', width: 120, fixed: 'right', render: () => '查看' },
  ]}
  dataSource={Array.from({ length: 24 }).map((_, i) => ({
    key: String(i + 1),
    name: `用户${i + 1}`,
    age: 18 + (i % 20),
    city: ['北京', '上海', '深圳', '杭州'][i % 4],
    phone: `188-0000-${String(i + 1).padStart(4, '0')}`,
    email: `user${i + 1}@example.com`,
    address: `示例地址 ${i + 1} 号`,
  }))}
/>
```

## 属性

| 属性名 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `columns` | 列定义 | `ReadonlyArray<TableColumn<T>>` | 无 |
| `dataSource` | 数据源 | `ReadonlyArray<T>` | 无 |
| `rowKey` | 行 key 生成函数（未传则尝试使用 `record.key`） | `(record: T, index: number) => string` | 无 |
| `width` | 表格宽度 | `number` | 按列宽求和 |
| `height` | 表格高度（传入后可滚动） | `number` | 无 |
| `size` | 尺寸 | `'small' \| 'middle' \| 'large'` | `'middle'` |
| `bordered` | 是否展示边框 | `boolean` | `true` |
| `affixHeader` | 是否固定表头（需设置 `height`） | `boolean` | `true` |
| `theme` | 主题（可选） | `ThemePalette` | 当前主题模式 |

## 类型

### TableColumn

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| `title` | 表头标题 | `string` |
| `dataIndex` | 取值字段（可选） | `keyof T & string` |
| `key` | 列唯一 key | `string` |
| `width` | 列宽 | `number` |
| `fixed` | 固定列（可选） | `'left' \| 'right'` |
| `render` | 单元格渲染 | `(value: unknown, record: T, rowIndex: number) => WidgetProps \| JSXElement \| string \| number \| null \| undefined` |

## Tips

- 列未显式传 `width` 时，默认按 `160` 计算，建议为关键列指定固定宽度以获得更稳定的布局。
