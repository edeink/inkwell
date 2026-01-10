# 电子表格 (Spreadsheet)

这是一个基于 `@edeink/inkwell` 框架构建的高性能电子表格演示项目，展示了处理百万级数据渲染、稀疏矩阵存储和公式计算引擎的能力。

## 目录结构

```
src/demo/spreadsheet/
├── __tests__/                  # 测试用例
├── components/                 # React UI 组件 (如工具栏)
│   ├── spreadsheet-toolbar/
│   └── ...
├── widgets/                    # Inkwell Widget 组件
│   ├── col-header.tsx          # 列头组件
│   ├── row-header.tsx          # 行头组件
│   ├── corner.tsx              # 左上角空白块
│   ├── grid.tsx                # 网格主体渲染组件
│   ├── editable-text.tsx       # 单元格编辑组件
│   └── ...
├── app.tsx                     # 应用入口
├── index.tsx                   # 外部挂载点
├── spreadsheet-model.ts        # 数据模型与逻辑核心
├── spreadsheet.tsx             # 表格主容器组件
└── types.ts                    # 类型定义
```

## 核心架构与实现

### 1. 数据存储模型

为了高效处理大规模数据（例如百万行），项目采用稀疏矩阵模型存储数据：

-   **SpreadsheetModel**: 核心数据模型类。
-   **稀疏存储**: 仅存储有数据的单元格 (`Map<string, CellData>`)，key 为行列坐标组合。
-   **SizeManager**: 专门管理行高和列宽。
    -   支持默认尺寸。
    -   使用 `Map` 存储自定义尺寸的行/列。
    -   提供 `O(1)` 或 `O(log N)` 的位置偏移计算 (`getOffset`) 和索引查找 (`getIndex`)。

### 2. 渲染优化 (虚拟化)

表格渲染采用**虚拟滚动 (Virtual Scrolling)** 技术，仅渲染视口内的单元格：

-   **SpreadsheetGrid**: 负责计算可见区域 (`Viewport`)。
    -   根据 `scrollY` 和 `scrollX` 计算起始行列 (`startRow`, `startCol`)。
    -   根据视口尺寸计算结束行列。
    -   仅遍历可见范围内的行列进行渲染，极大降低了 DOM/RenderObject 的数量。
-   **增量更新**: 利用 Inkwell 的 Diff 算法，仅更新变化的单元格。

### 3. 公式计算引擎

内置了一个简单的递归下降公式解析器：

-   **evaluateFormula**:
    -   支持以 `=` 开头的公式。
    -   支持单元格引用 (如 `A1`, `B2`)。
    -   支持基础数学运算。
    -   **递归求值**: 当引用的单元格也是公式时，会递归计算其值。

### 4. 交互与编辑

-   **选择区域**: 支持拖拽选择单元格区域 (`SelectionRange`)。
-   **单元格编辑**:
    -   双击单元格进入编辑模式。
    -   `EditableText` 组件在 Canvas 上层覆盖一个真实 DOM 输入框，实现原生输入体验。
    -   编辑完成后回写模型并触发重绘。
-   **行列调整**: 支持拖拽行头/列头边缘调整尺寸。

## 状态管理

-   **Spreadsheet (Controller)**: 作为顶层组件，管理 `scrollX`, `scrollY`, `selection`, `editingCell` 等 UI 状态。
-   **Model-View 同步**:
    -   UI 操作调用 `model` 方法更新数据。
    -   通过 `setState` 或 `version` 字段强制触发视图更新。
    -   支持外部数据版本控制 (`dataVersion`)。

## 技术栈

-   **Framework**: `@edeink/inkwell`
-   **Data Structure**: Sparse Matrix (稀疏矩阵)
-   **Algorithm**: Virtual Scrolling (虚拟滚动), Recursive Descent Parser (递归下降解析)
```
