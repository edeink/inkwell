# 项目优化日志 (Optimization Log)

**项目名称**: `@edeink/inkwell`
**文档版本**: 1.0.0
**最后更新**: 2026-01-08

## 目录索引 (Index)

1. [OPT-20260108-01] 基础组件初始化与事件绑定优化
2. [OPT-20260108-02] 浅比较算法 (Shallow Diff) 内存分配优化
3. [OPT-20260108-03] Key 生成与子节点构建列表优化
4. [OPT-20260108-04] 移除生产环境性能埋点 (Instrumentation Removal)
5. [OPT-20260108-05] 子组件构建 Map 对象复用优化
6. [OPT-20260108-06] 浅比较数组 Diff 循环合并与严格 Key 检查
7. [OPT-20260108-07] Flex 属性初始化内存优化 (Shared Object)
8. [OPT-20260108-08] 移除 Key 强制字符串转换

---

## 优化记录详情

### [OPT-20260108-08] 移除 Key 强制字符串转换

- **优化日期**: 2026-01-08
- **优化类型**: 逻辑优化 (Logic & Micro-optimization)
- **相关文件**: `src/core/base.ts`

#### 性能对比
| 指标 | 优化前 (Baseline) | 优化后 (Optimized) | 提升幅度 |
| :--- | :--- | :--- | :--- |
| 滚动帧平均耗时 | 32.78ms | 32.99ms | *(统计波动)* |
| **Key 类型支持** | 仅 String | **Any (String/Number)** | **修复数字 Key 复用问题** |

#### 优化内容
移除了 `buildChildren` 循环中对 `childData.key` 的强制 `String()` 转换。
1.  **减少开销**: 避免了对已有字符串 Key 的冗余调用和对数字 Key 的隐式转换分配。
2.  **逻辑修复**: 确保在使用数字 Key 时，能够正确匹配到 `byKey` Map 中存储的 Widget（前提是 Widget 初始化时也保留了原始类型 Key）。

#### 代码变更 (Diff)
```typescript
// src/core/base.ts - buildChildren

for (const childData of childrenData) {
- const k = childData.key ? String(childData.key) : null;
+ const k = childData.key;
  // ...
- if (k) {
+ if (k != null) {
    reuse = byKey.get(k) ?? null;
  }
}
```

---

### [OPT-20260108-07] Flex 属性初始化内存优化 (Shared Object)

- **优化日期**: 2026-01-08
- **优化类型**: 内存优化 (GC Pressure Reduction)
- **相关文件**: `src/core/base.ts`

#### 性能对比
| 指标 | 优化前 (Baseline) | 优化后 (Optimized) | 提升幅度 |
| :--- | :--- | :--- | :--- |
| 滚动帧平均耗时 | 33.02ms | 33.76ms | *(统计波动)* |
| **内存分配 (Allocations)** | ~8300 objs/frame | **0 objs/frame** | **-100% (针对无 flex 属性组件)** |

*注：虽然 CPU 耗时在统计上无显著变化（甚至略有波动），但对于无 `flex` 属性的组件（如 Spreadsheet 中的单元格），每帧减少了 ~8300 个空对象的创建，极大降低了长期运行的 GC 压力。*

#### 优化内容
引入 `Widget.EMPTY_FLEX` 静态冻结对象，替代 `this.flex = data.flex || {}` 中的动态空对象创建。

#### 代码变更 (Diff)
```typescript
// src/core/base.ts

+ // 共享空对象，减少 flex 属性初始化时的内存分配
+ private static EMPTY_FLEX = Object.freeze({});

// init 方法内
- this.flex = data.flex || {};
+ this.flex = (data.flex || Widget.EMPTY_FLEX) as FlexProperties;
```

---

### [OPT-20260108-06] 浅比较数组 Diff 循环合并与严格 Key 检查

- **优化日期**: 2026-01-08
- **优化类型**: 算法优化 (Algorithm)
- **相关文件**: `src/core/base.ts`

#### 性能对比
| 指标 | 优化前 (Baseline) | 优化后 (Optimized) | 提升幅度 |
| :--- | :--- | :--- | :--- |
| 滚动帧平均耗时 | 33.58ms | 33.02ms | **+1.67%** |
| 最小帧耗时 (Min) | 33.13ms | 31.88ms | **+3.77%** |

#### 优化内容
重构 `shallowArrayDiff`，将原本的 "Key 检查循环" 和 "内容检查循环" 合并为一次遍历。同时移除 `String(key)` 转换，改用严格相等性检查（依赖 `shallowDiff` 的全属性检查机制），减少了大量字符串分配和循环开销。

#### 代码变更 (Diff)
```typescript
// src/core/base.ts - shallowArrayDiff

// 移除第一次循环和 String 转换
- for (let i = 0; i < prevArray.length; i++) {
-   const prevKey = prevArray[i].key ? String(prevArray[i].key) : '';
-   // ... check equality
- }
- for (let i = 0; i < nextArray.length; i++) { ... }

// 合并为单次循环
+ for (let i = 0; i < prevArray.length; i++) {
+   const a = prevArray[i];
+   const b = nextArray[i];
+   // ... check existence
+   // Content mismatch (shallowDiff checks all props including key)
+   if (this.shallowDiff(a, b)) return true;
+   // ...
+ }
```

---

### [OPT-20260108-05] 子组件构建 Map 对象复用优化

- **优化日期**: 2026-01-08
- **优化类型**: 内存优化 (Memory Allocation)
- **相关文件**: `src/core/base.ts`

#### 性能对比
| 指标 | 优化前 (Baseline) | 优化后 (Optimized) | 提升幅度 |
| :--- | :--- | :--- | :--- |
| 滚动帧平均耗时 | 34.37ms | 33.58ms | **+2.30%** |

#### 优化内容
在 `buildChildren` 方法中引入静态缓存 `_buildCache`，复用 `byKey` 和 `prevNoKey` 两个 `Map` 对象，避免了在每次组件构建时重复创建和销毁 Map 实例的开销。同时实现了简单的锁机制以安全处理潜在的递归调用场景。

#### 代码变更 (Diff)
```typescript
// src/core/base.ts

// 引入静态缓存
+ private static _buildCache = {
+   byKey: new Map<string, Widget>(),
+   prevNoKey: new Map<string, Widget[]>(),
+   locked: false,
+ };

// buildChildren 方法内
- const byKey = new Map<string, Widget>();
- const prevNoKey = new Map<string, Widget[]>();
+ if (!Widget._buildCache.locked) {
+   Widget._buildCache.locked = true;
+   byKey = Widget._buildCache.byKey;
+   prevNoKey = Widget._buildCache.prevNoKey;
+   // ... clear maps ...
+ } else {
+   byKey = new Map();
+   prevNoKey = new Map();
+ }
```

---

### [OPT-20260108-04] 移除生产环境性能埋点

- **优化日期**: 2026-01-08
- **优化类型**: 性能优化 (Runtime Overhead Removal)
- **相关文件**: `src/core/base.ts`

#### 性能对比
| 指标 | 优化前 (Baseline) | 优化后 (Optimized) | 提升幅度 |
| :--- | :--- | :--- | :--- |
| 滚动帧平均耗时 | 38.06ms | 34.37ms | **+9.69%** |

#### 优化内容
移除了核心热点方法（`buildChildren`, `createElement`, `getBoundingBox`）上的 `@measure` 装饰器。虽然该装饰器用于开发阶段性能分析，但在高频调用场景下（如滚动时的每帧构建），装饰器带来的函数调用栈深度增加和 `performance.now()` 统计开销变得不可忽视。

#### 代码变更 (Diff)
```typescript
// src/core/base.ts

- @measure
  protected buildChildren(childrenData: WidgetProps[]): void {
    // ...
  }

- @measure
  createElement(data: TData): Widget {
    // ...
  }
```

---

### [OPT-20260108-03] Key 生成与子节点构建列表优化

- **优化日期**: 2026-01-08
- **优化类型**: 内存优化 (Memory Allocation)
- **相关文件**: `src/core/base.ts`

#### 性能对比
| 指标 | 优化前 (Baseline) | 优化后 (Optimized) | 提升幅度 |
| :--- | :--- | :--- | :--- |
| 滚动帧平均耗时 | 39.33ms | 38.06ms | **+3.23%** (累积) |

#### 优化内容
1.  **Key 生成优化**: 将 `_generateKey` 中的 `toString(36)` 改为 `toString()`，减少进制转换开销；移除该微小函数的 `@measure` 装饰器。
2.  **列表迭代优化**: 在 `buildChildren` 中，移除 `Array.from(prevNoKey.values())`，直接迭代 `Map.values()` 迭代器，避免创建临时数组。

#### 代码变更 (Diff)
```typescript
// src/core/base.ts

// 1. Key 生成
- return (Widget._idCounter++).toString(36);
+ return (Widget._idCounter++).toString();

// 2. 列表迭代
- const prevNoKeyValues = Array.from(prevNoKey.values());
- for (const list of prevNoKeyValues) {
+ for (const list of prevNoKey.values()) {
    list.reverse();
  }
```

---

### [OPT-20260108-02] 浅比较算法 (Shallow Diff) 内存分配优化

- **优化日期**: 2026-01-08
- **优化类型**: 算法优化 (Algorithm & Memory)
- **相关文件**: `src/core/base.ts`

#### 性能对比
| 指标 | 优化前 (Baseline) | 优化后 (Optimized) | 提升幅度 |
| :--- | :--- | :--- | :--- |
| 滚动帧平均耗时 | 41.09ms | 39.33ms | **+4.28%** (累积) |

#### 优化内容
重构了 `shallowDiff` 和 `shallowArrayDiff` 方法，完全移除了 `Object.keys()`、`.filter()` 和 `.map()` 等产生临时数组的操作。改为使用 `for...in` 循环和直接索引访问，显著减少了垃圾回收 (GC) 压力。

#### 代码变更 (Diff)
```typescript
// src/core/base.ts - shallowDiff

- const ka = Object.keys(a).filter((k) => k !== 'children');
- for (const k of ka) { ... }
+ for (const k in a) {
+   if (k === 'children') continue;
+   if (a[k] !== b[k]) return true;
+ }
```

---

### [OPT-20260108-01] 基础组件初始化与事件绑定优化

- **优化日期**: 2026-01-08
- **优化类型**: 初始化优化 (Initialization)
- **相关文件**: `src/core/base.ts`, `src/core/events/dom-event-manager.ts`

#### 性能对比
| 指标 | 优化前 (Baseline) | 优化后 (Optimized) | 提升幅度 |
| :--- | :--- | :--- | :--- |
| 滚动帧平均耗时 | ~44.00ms | 41.80ms | **+5.00%** |
| 初始构建耗时 | 109.09ms | 108.03ms | ~1.00% |

#### 优化内容
1.  **数组重置**: 将 `this.children = []` 替换为 `this.children.length = 0`，保留数组内存引用。
2.  **事件绑定**: 优化 `DOMEventManager`，移除 `Object.entries` 和正则匹配，改用 `for...in` 和字符串前缀检查。
3.  **状态复用**: 在标记 `_isReused` 前增加状态检查，减少不必要的写操作。

#### 代码变更 (Diff)
```typescript
// src/core/base.ts

// 数组重置
- this.children = [];
+ if (this.children.length > 0) this.children.length = 0;

// 状态复用
- reuse._isReused = true;
+ if (!reuse._isReused) reuse._isReused = true;
```

---

## 测试环境说明 (Test Environment)

- **硬件环境**: macOS (模拟环境)
- **测试工具**: Vitest v2.1.9
- **基准测试脚本**: `src/demo/spreadsheet/benchmark-scroll.test.ts`
- **测试场景**: SpreadsheetGrid (5000x4000 虚拟像素，约 8300 个单元格)，模拟连续滚动 50 帧。
- **数据统计**: 每次基准测试运行 5 轮，取平均值。
