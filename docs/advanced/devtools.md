---
id: devtools
title: 开发者工具
sidebar_position: 4
---

# 开发者工具

Inkwell 配备了强大的开发者工具 (DevTools)，旨在帮助开发者实时检查 Widget 树、调试布局、修改属性以及监控性能。

## 启动与集成

DevTools 作为一个独立的浮层组件集成在你的应用中。

### 安装

在应用的根组件中引入并渲染 `DevTools`：

```tsx
import { DevTools } from '@/devtools';
import { MindMap } from './mindmap'; // 你的应用组件

function App() {
  return (
    <>
      {/* 你的业务组件 */}
      <MindMap />
      
      {/* 调试工具组件 */}
      <DevTools /> 
    </>
  );
}
```

### 快捷键
- **切换显示/隐藏**：`Cmd + Shift + D` (Mac) 或 `Ctrl + Shift + D` (Windows)。

### 尝试一下

```tsx mode:render
/** @jsxImportSource @/utils/compiler */
<Container color="#f6ffed" borderRadius={12} padding={16}>
  <Column spacing={12}>
    <Text text="DevTools · Inspect / Overlay / Props" fontSize={18} color="#1677ff" />
    <Row spacing={12}>
      <Container width={160} height={96} color="#e6f4ff" borderRadius={12}>
        <Center>
          <Text text="Box A" fontSize={16} color="#2467c0" />
        </Center>
      </Container>
      <Container width={160} height={96} color="#fff1f0" borderRadius={12}>
        <Center>
          <Text text="Box B" fontSize={16} color="#d4380d" />
        </Center>
      </Container>
    </Row>
  </Column>
</Container>
```

```tsx mode:render
/** @jsxImportSource @/utils/compiler */
<Container color="#f6ffed" borderRadius={12} padding={16}>
  <Column spacing={12}>
    <Text text="DevTools · Inspect / Overlay / Props" fontSize={18} color="#1677ff" />
    <Row spacing={12}>
      <Container width={160} height={96} color="#e6f4ff" borderRadius={12}>
        <Center>
          <Text text="Anthor Box A" fontSize={16} color="#2467c0" />
        </Center>
      </Container>
      <Container width={160} height={96} color="#fff1f0" borderRadius={12}>
        <Center>
          <Text text="Anthor Box B" fontSize={16} color="#d4380d" />
        </Center>
      </Container>
    </Row>
  </Column>
</Container>
```

## 核心功能

### 1. Widget 树检视 (Tree Inspector)

左侧面板展示了当前运行时的 Widget 树结构。
- **层级结构**：清晰展示父子关系。
- **组件类型**：显示 Widget 的类名（如 `Container`, `Text`, `Row`）。
- **Key**：显示组件的 Key，便于区分同类组件。

### 2. 属性编辑器 (Props Editor)

当在树中选中一个 Widget，或通过 Inspect 模式点击画布上的元素时，右侧面板会显示该组件的详细信息：
- **Props**：实时查看和修改组件属性（如 `width`, `height`, `color`）。修改后画布会立即刷新。
- **State**：对于 `StatefulWidget`，可以查看当前状态。
- **Layout**：显示组件的盒模型数据（Position, Size, Padding, Margin）。

### 3. 元素选取 (Inspect Mode)
