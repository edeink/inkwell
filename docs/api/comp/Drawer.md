---
title: Drawer
---

核心用途：抽屉面板（右侧滑出），支持遮罩点击关闭与自定义内容。

## 如何引入

- 项目代码：`import { Drawer } from '@/comp'`
- 文档/示例：在代码块首行添加 `/** @jsxImportSource @/utils/compiler */`

## 示例

### 基础用法

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  class DrawerDemo extends StatefulWidget {
    state = { open: false };

    render() {
      const theme = getCurrentTheme();
      const viewportWidth = 600;
      const viewportHeight = 300;
      const height = 32;
      const opened = this.state.open;

      return (
        <Stack allowOverflowPositioned={true}>
          <Container
            width={viewportWidth}
            height={viewportHeight}
            border={{ width: 1, color: theme.border.secondary }}
            borderRadius={8}
            color={theme.background.container}
          />

          <Positioned left={16} top={16}>
            <Button
              theme={theme}
              btnType={opened ? 'default' : 'primary'}
              onClick={() => this.setState({ open: !opened })}
            >
              <Text
                text={opened ? '关闭抽屉' : '打开抽屉'}
                fontSize={14}
                lineHeight={height}
                color={opened ? theme.text.primary : theme.text.inverse}
                textAlignVertical={TextAlignVertical.Center}
                pointerEvent="none"
              />
            </Button>
          </Positioned>

          <Drawer
            theme={theme}
            open={opened}
            viewportWidth={viewportWidth}
            viewportHeight={viewportHeight}
            title="示例抽屉"
            onClose={() => this.setState({ open: false })}
          >
            <Column spacing={8} crossAxisAlignment={CrossAxisAlignment.Start}>
              <Text text="这里是抽屉内容" color={theme.text.primary} pointerEvent="none" />
              <Text text="可放置表单、列表等组件" color={theme.text.primary} pointerEvent="none" />
            </Column>
          </Drawer>
        </Stack>
      );
    }
  }

  return <DrawerDemo />;
})()
```

## 属性

| 属性名 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `open` | 是否打开 | `boolean` | 必填 |
| `viewportWidth` | 视口宽度（用于遮罩与定位） | `number` | 必填 |
| `viewportHeight` | 视口高度（用于遮罩与定位） | `number` | 必填 |
| `width` | 抽屉宽度 | `number` | `378` |
| `title` | 标题 | `string` | `'抽屉'` |
| `maskClosable` | 点击遮罩是否触发关闭 | `boolean` | `true` |
| `theme` | 主题（可选） | `ThemePalette` | 当前主题模式 |
| `onClose` | 关闭回调 | `(e: InkwellEvent) => void` | 无 |

- children 支持类型：`Multiple`
