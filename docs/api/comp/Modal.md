---
title: Modal
---

核心用途：模态对话框，包含遮罩、标题、内容区与底部操作区（确定/取消）。

## 如何引入

- 项目代码：`import { Modal } from '@/comp'`
- 文档/示例：在代码块首行添加 `/** @jsxImportSource @/utils/compiler */`

## 示例

### 基础用法

```tsx mode:edit
/** @jsxImportSource @/utils/compiler */
(() => {
  class ModalDemo extends StatefulWidget {
    state = { open: false };

    render() {
      const theme = getCurrentTheme();
      const height = 32;
      const opened = this.state.open;

      return (
        <Stack allowOverflowPositioned={true}>
          <Container
            width={600}
            height={320}
            border={{ width: 1, color: theme.border.secondary }}
            borderRadius={8}
            color={theme.background.container}
          />
          <Positioned left={16} top={16} pointerEvent="none">
            <Column spacing={6} crossAxisAlignment={CrossAxisAlignment.Start}>
              <Text text="示例窗口（600×320）" fontSize={12} color={theme.text.secondary} />
              <Text text="点击按钮打开/关闭 Modal。" fontSize={12} color={theme.text.secondary} />
            </Column>
          </Positioned>

          <Positioned left={16} top={64}>
            <Button
              theme={theme}
              btnType={opened ? 'default' : 'primary'}
              onClick={() => this.setState({ open: !opened })}
            >
              <Text
                text={opened ? '关闭 Modal' : '打开 Modal'}
                fontSize={14}
                lineHeight={height}
                color={opened ? theme.text.primary : theme.text.inverse}
                textAlignVertical={TextAlignVertical.Center}
                pointerEvent="none"
              />
            </Button>
          </Positioned>

          <Modal
            theme={theme}
            open={opened}
            width={360}
            title="对话框"
            onCancel={() => {
              this.setState({ open: false });
              message.info('已取消');
            }}
            onOk={() => {
              this.setState({ open: false });
              message.success('已确认');
            }}
          >
            <Column spacing={8} crossAxisAlignment={CrossAxisAlignment.Start}>
              <Text
                text="这是一个基于 InkWell Widget 实现的 Modal。"
                fontSize={14}
                lineHeight={22}
                color={theme.text.primary}
                pointerEvent="none"
              />
              <Text
                text="通过 Overlay 自适应容器尺寸，内容会在窗口内居中显示。"
                fontSize={14}
                lineHeight={22}
                color={theme.text.primary}
                pointerEvent="none"
              />
            </Column>
          </Modal>
        </Stack>
      );
    }
  }

  return <ModalDemo />;
})()
```

## 属性

| 属性名 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `open` | 是否打开 | `boolean` | 必填 |
| `width` | 对话框宽度 | `number` | `520` |
| `title` | 标题 | `string` | 无 |
| `maskClosable` | 点击遮罩是否触发取消 | `boolean` | `true` |
| `okText` | 确认按钮文本 | `string` | `'确定'` |
| `cancelText` | 取消按钮文本 | `string` | `'取消'` |
| `theme` | 主题（可选） | `ThemePalette` | 当前主题模式 |
| `onOk` | 点击确认回调 | `(e: InkwellEvent) => void` | 无 |
| `onCancel` | 点击取消/遮罩回调 | `(e: InkwellEvent) => void` | 无 |

- children 支持类型：`Multi`

## Tips

- Modal 会通过 Overlay 容器的尺寸自适应生成遮罩与居中布局，无需额外传入视口尺寸。
