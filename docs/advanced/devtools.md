---
id: devtools
title: 开发者工具
sidebar_position: 4
---

# 开发者工具

Inkwell 提供开发者工具（DevTools），用于查看 Widget 树、拾取节点并编辑属性。

## 集成

在应用的根组件中引入并渲染 `DevTools`：

```tsx
import { DevTools } from '@/devtools';

function App() {
  return (
    <>
      <DevTools />
    </>
  );
}
```

## 使用

- 打开面板：点击下方按钮或快捷键 `CmdOrCtrl + Shift + D`
- 拾取：打开面板后，点击左上角 Inspect 图标，移动鼠标并点击目标节点

```tsx mode:render
/** @jsxImportSource @/utils/compiler */
(() => {
  const theme = getCurrentTheme();
  const height = 32;

  const cardBg = theme.background.surface;
  const accentA = theme.state.selected;
  const inspectSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="currentColor"><path d="M905.508571 422.034286c27.062857 0 49.005714-19.017143 49.005715-48.054857V52.589714c0-29.037714-21.942857-52.589714-49.371429-52.589714H48.932571C21.942857 0 0 23.552 0 54.125714v847.725715c0 29.110857 21.942857 52.662857 49.005714 52.662857h295.131429c27.062857 0 48.859429-23.552 48.859428-52.662857 0-29.037714-21.796571-52.589714-48.859428-52.589715H98.011429V105.325714h758.637714v268.726857c0 29.037714 21.942857 47.981714 49.005714 47.981715z m-533.942857-47.177143a29.915429 29.915429 0 0 0-5.851428 6.509714c0 3.218286 196.022857 553.618286 199.241143 559.762286 8.338286 15.140571 18.066286 6.509714 66.56-59.318857 25.6-35.401143 71.241143-92.013714 73.728-94.573715 3.657143-3.657143 22.893714 16.603429 90.550857 84.187429 46.299429 46.299429 78.336 83.090286 80.164571 83.090286 4.681143 0 82.139429-78.336 82.139429-83.090286 0-1.755429-42.788571-38.253714-88.649143-84.187429-45.933714-46.299429-83.675429-79.652571-82.212572-81.846857 1.097143-1.755429 52.516571-42.715429 88.722286-68.754285 35.84-26.331429 66.194286-50.249143 67.291429-53.540572 1.462857-2.925714 0.731429-7.606857-1.097143-10.459428-2.56-4.388571-551.131429-202.532571-562.688-203.264-1.462857-0.292571-5.12 2.194286-7.972572 5.485714z"/></svg>`;

  return (
    <Container color={cardBg} borderRadius={12} padding={16}>
      <Column spacing={12} mainAxisSize="min">
        <Row spacing={12} mainAxisSize="min">
          <Button
            theme={theme}
            btnType="primary"
            onClick={() => window.dispatchEvent(new Event('INKWELL_DEVTOOLS_OPEN'))}
          >
            <Text
              text="打开 DevTools"
              fontSize={14}
              lineHeight={height}
              color={theme.text.inverse}
              textAlignVertical={TextAlignVertical.Center}
              pointerEvent="none"
            />
          </Button>
        </Row>
        <Row spacing={12} mainAxisAlignment="center">
          <Container width={280} height={96} color={accentA} borderRadius={12}>
            <Center>
              <Column spacing={12} mainAxisSize="min">
                 <Row spacing={12} mainAxisSize="min" mainAxisAlignment="center">
                   <Text text="点击左上角" fontSize={14} color={theme.text.primary} />
                  <Icon svg={inspectSvg} size={16} color={theme.text.primary} />
                </Row>
                <Text
                  text="激活 Inspect 后，移动鼠标并点击此处"
                  fontSize={14}
                  color={theme.text.primary}
                />~
              </Column>
            </Center>
          </Container>
        </Row>
      </Column>
    </Container>
  );
})()
```

## 功能概览

- Tree：查看 Widget 树与当前选中节点路径
- Inspect：悬浮高亮，点击选中，并联动到 Tree
- Props：查看与修改 Props / State / Layout

拾取依赖命中测试结果，可能受 `pointerEvent`、尺寸与变换影响。
