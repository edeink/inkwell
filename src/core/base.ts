import { DOMEventManager } from './events/dom-event-manager';
import { EventRegistry } from './events/registry';
import {
  applySteps,
  composeSteps,
  IDENTITY_MATRIX,
  invert,
  multiply,
  multiplyTranslate,
  transformPoint,
  type TransformStep,
} from './helper/transform';
import { WidgetRegistry } from './registry';
import {
  type BoxConstraints,
  type BuildContext,
  type CursorType,
  type FlexProperties,
  type Offset,
  type PointerEvents,
  type Ref,
  type RenderObject,
  type Size,
  type WidgetEventHandler,
  type WidgetProps,
} from './type';

import type { PipelineOwner } from './pipeline/owner';
import type { IRenderer } from '@/renderer/IRenderer';
import type Runtime from '@/runtime';

export type {
  BoxConstraints,
  BuildContext,
  Constraints,
  CursorType,
  FlexProperties,
  Offset,
  PointerEvents,
  Ref,
  RenderObject,
  Size,
  WidgetConstructor,
  WidgetEventHandler,
  WidgetProps,
} from './type';

// 内置的属性
export type WidgetCompactProps<T extends WidgetProps, C = WidgetProps[]> = {
  [P in keyof T]: P extends 'children' ? C : T[P];
} & WidgetEventHandler;

// 构造器类型：约束 Widget 的数据类型与返回实例类型保持一致

/**
 * 创建默认的盒约束
 */
export function createBoxConstraints(options: Partial<BoxConstraints> = {}): BoxConstraints {
  return {
    minWidth: options.minWidth ?? 0,
    maxWidth: options.maxWidth ?? Infinity,
    minHeight: options.minHeight ?? 0,
    maxHeight: options.maxHeight ?? Infinity,
  };
}

/**
 * 创建紧约束
 */
export function createTightConstraints(width: number, height: number): BoxConstraints {
  return {
    minWidth: width,
    maxWidth: width,
    minHeight: height,
    maxHeight: height,
  };
}

/**
 * 判断约束是否相等
 */
export function areConstraintsEqual(a: BoxConstraints, b: BoxConstraints): boolean {
  return (
    a.minWidth === b.minWidth &&
    a.maxWidth === b.maxWidth &&
    a.minHeight === b.minHeight &&
    a.maxHeight === b.maxHeight
  );
}

function resolveWidgetTypeForInstance(data: WidgetProps, fallbackType: string): string {
  const anyData = data as unknown as Record<string, unknown>;
  const next = anyData.__inkwellType;
  if (typeof next === 'string' && next) {
    return next;
  }
  const legacy = anyData.type;
  if (
    typeof legacy === 'string' &&
    legacy &&
    (legacy === fallbackType || WidgetRegistry.hasRegisteredType(legacy))
  ) {
    anyData.__inkwellType = legacy;
    return legacy;
  }
  anyData.__inkwellType = fallbackType;
  return fallbackType;
}

function resolveWidgetTypeForData(data: WidgetProps): string | null {
  const anyData = data as unknown as Record<string, unknown>;
  const next = anyData.__inkwellType;
  if (typeof next === 'string' && next) {
    return next;
  }
  const legacy = anyData.type;
  if (typeof legacy === 'string' && legacy && WidgetRegistry.hasRegisteredType(legacy)) {
    anyData.__inkwellType = legacy;
    return legacy;
  }
  return null;
}

/**
 * 判断是否为紧约束（宽高固定）
 */
export function isTight(c: BoxConstraints): boolean {
  return c.minWidth === c.maxWidth && c.minHeight === c.maxHeight;
}

/**
 * 基础组件类
 */
export abstract class Widget<TData extends WidgetProps = WidgetProps> {
  key!: string;
  eventKey!: string;
  type!: string;
  children: Widget[] = [];
  private _childrenData: WidgetProps[] = [];
  parent: Widget | null = null;
  // 编译 JSX 得到的数据
  data!: TData;
  // 为了兼容 React 用法，构造的属性
  props!: WidgetCompactProps<TData>;
  // base 不维护状态
  flex!: FlexProperties; // 添加flex属性
  depth: number = 0;
  renderObject: RenderObject = {
    offset: { dx: 0, dy: 0 },
    size: { width: 0, height: 0 },
  };
  zIndex: number = 0;
  pointerEvent: PointerEvents = 'auto';
  cursor?: CursorType;
  ref?: Ref<unknown> | ((instance: unknown) => void);

  // 根节点
  private __root: Widget | null = null;
  // 运行时实例
  private _runtime?: Runtime;
  // 初始化默认没有布局，需要布局
  protected _needsLayout: boolean = true;
  protected _needsPaint: boolean = true;
  protected _isBuilt: boolean = false;
  protected _dirty: boolean = false;
  protected _disposed: boolean = false;
  public _isReused: boolean = false;
  protected _suppressDidUpdateWidget: boolean = false;
  private _didInitWidget: boolean = false;
  private _cachedBoundingBox: { x: number; y: number; width: number; height: number } | null = null;
  protected _worldMatrix?: [number, number, number, number, number, number];
  private _inverseWorldMatrix: [number, number, number, number, number, number] | null = null;

  // RepaintBoundary 相关
  public isRepaintBoundary: boolean = false;
  protected _layer: {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  } | null = null;

  protected _relayoutBoundary: Widget | null = null;
  private _owner?: PipelineOwner;

  public get isRelayoutBoundary(): boolean {
    return this._relayoutBoundary === this;
  }

  /**
   * 是否是 Positioned 组件
   * 用于 Stack 布局优化，避免反射检查
   */
  public get isPositioned(): boolean {
    return false;
  }

  public get owner(): PipelineOwner | undefined {
    return this._owner ?? this.runtime?.pipelineOwner;
  }

  public get isMounted(): boolean {
    return !!this.owner;
  }

  public set owner(v: PipelineOwner | undefined) {
    this._owner = v;
  }

  // 自动 Key 生成计数器
  private static _idCounter = 0;
  // 对象池
  public static _pool = new Map<string, Widget[]>();
  // 共享空对象，减少 flex 属性初始化时的内存分配
  private static EMPTY_FLEX = Object.freeze({});

  // 构建缓存：复用 Map 以避免高频创建
  private static _buildCache = {
    byKey: new Map<string, Widget>(),
    prevNoKey: new Map<string, Widget[]>(),
    locked: false,
  };

  /**
   * 生成唯一 Key
   * @param type 组件类型
   * @returns 唯一的 Key 字符串
   */
  private static _generateKey(type: string): string {
    return `${type}-${Widget._idCounter++}`;
  }

  constructor(data: TData) {
    this.initBase(data);
  }

  protected init(data: TData) {
    this.initBase(data);
    this.ensureInitWidget(data);
  }

  protected initWidget(_data: TData): void {}

  protected ensureInitWidget(data: TData): void {
    if (this._didInitWidget) {
      return;
    }
    this.initWidget(data);
    this._didInitWidget = true;
  }

  protected initBase(data: TData) {
    if (!data) {
      throw new Error('组件数据不能为空');
    }
    const widgetType = resolveWidgetTypeForInstance(data, this.constructor.name);

    // 如果未提供 key，则自动生成唯一且可读的 key
    this.key = data.key || Widget._generateKey(widgetType);
    this.eventKey = Widget._generateKey(`${widgetType}-evt`);
    this.type = widgetType;
    // 编译 JSX 得到的数据
    this.data = data;
    // 实际运行的 props
    const slotChildren = Array.isArray(data.children) ? (data.children as WidgetProps[]) : [];
    this.props = { ...data, children: slotChildren } as unknown as WidgetCompactProps<TData>;
    this.flex = (data.flex || Widget.EMPTY_FLEX) as FlexProperties; // 初始化flex属性
    this.zIndex = typeof data.zIndex === 'number' ? (data.zIndex as number) : 0;

    // 优先使用 pointerEvent，其次 pointerEvents，默认为 auto
    const pe = data.pointerEvent ?? 'auto';
    this.pointerEvent = pe;

    this.cursor = data.cursor;
    // RepaintBoundary 相关
    if (typeof (data as { isRepaintBoundary?: unknown }).isRepaintBoundary !== 'undefined') {
      this.isRepaintBoundary = !!(data as { isRepaintBoundary?: unknown }).isRepaintBoundary;
    }
    this.ref = data.ref;

    // 重置状态
    if (this.children.length > 0) {
      this.children.length = 0;
    }
    if (this._childrenData.length > 0) {
      this._childrenData.length = 0;
    }
    this.parent = null;
    this.__root = null;
    this._runtime = undefined;
    this._disposed = false;
    this._isReused = false;
    this._dirty = false;
    this._needsLayout = true;
    this._needsPaint = true;
    this._isBuilt = false;
    this._cachedBoundingBox = null;
    this._didInitWidget = false;
  }

  public exposeMethods(methods: Record<string, unknown>) {
    if (!this.ref) {
      return;
    }
    if (typeof this.ref === 'function') {
      this.ref(methods);
    } else if (this.ref && typeof this.ref === 'object') {
      this.ref.current = methods;
    }
  }

  public shallowDiff(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    if (a === b) {
      return false;
    }
    // 优化：使用 for...in 避免 Object.keys 和 filter 产生的临时数组
    for (const k in a) {
      if (k === 'children') {
        continue;
      }
      if (a[k] !== b[k]) {
        return true;
      }
    }
    for (const k in b) {
      if (k === 'children') {
        continue;
      }
      if (!(k in a)) {
        return true;
      }
    }
    return false;
  }

  private shallowArrayDiff(
    prevArray: Record<string, unknown>[],
    nextArray: Record<string, unknown>[],
  ): boolean {
    if (prevArray.length !== nextArray.length) {
      return true;
    }

    // 优化：合并循环，同时使用严格相等比较 key，避免 String() 转换和多次遍历
    for (let i = 0; i < prevArray.length; i++) {
      const a = prevArray[i];
      const b = nextArray[i];

      if (!a || !b) {
        return true;
      }

      // Content mismatch (shallowDiff checks all props including key)
      if (this.shallowDiff(a, b)) {
        return true;
      }

      if (a['children'] !== b['children']) {
        return true;
      }
    }
    return false;
  }

  public markDirty(): void {
    if (this._dirty) {
      return;
    }
    this._dirty = true;
    const rt = this.runtime as Runtime;
    if (rt) {
      rt.scheduleUpdate(this);
    }
    this.markNeedsLayout();
  }

  /**
   * 标记需要重新布局
   * 类似于 Flutter 的 markNeedsLayout 方法
   */
  markNeedsLayout(): void {
    // 优化：如果已经标记为需要布局，则无需重复处理
    if (this._needsLayout) {
      // 确保 _needsPaint 也被标记 (虽然通常 _needsLayout 隐含 _needsPaint，但为了安全起见)
      if (!this._needsPaint) {
        this.markNeedsPaint();
      }
      return;
    }

    // 修复：不要因为 _needsLayout 为 true 就提前返回
    // 必须确保脏状态能够正确传播到 Relayout Boundary 或 PipelineOwner
    this._needsLayout = true;
    this._cachedBoundingBox = null; // Invalidate layout cache
    this.markNeedsPaint();

    if (this._relayoutBoundary !== this) {
      this.markParentNeedsLayout();
    } else {
      if (this.owner) {
        this.owner.scheduleLayoutFor(this);
      }
      // 如果没有 owner，可能是初始化阶段或游离节点
      // 我们不在这里警告，因为 markParentNeedsLayout 会处理或者如果是根节点会在 attach 时处理
    }
  }

  markParentNeedsLayout(): void {
    this._needsLayout = true;
    const parent = this.parent;
    if (!this._dirty) {
      this.markNeedsPaint();
    }
    if (parent) {
      parent.markNeedsLayout();
    } else {
      // 智能警告抑制：仅当节点已挂载（有 owner）但找不到父节点时才警告
      if (this.isMounted) {
        // 如果是根节点，没有父节点是正常的，直接调度布局
        if (this.runtime && this.runtime.getRootWidget() === this) {
          this.owner?.scheduleLayoutFor(this);
          return;
        }

        console.warn(`[Layout] 节点 ${this.type}(${this.key}) 试图向上标记布局但没有父节点`);
      }
    }
  }

  /**
   * 标记需要重绘
   * 向上查找最近的 RepaintBoundary 并标记为脏
   */
  markNeedsPaint(): void {
    if (this._needsPaint) {
      return;
    }
    this._needsPaint = true;

    // 如果是绘制边界，则无需向上传播
    // 因为父级只需要绘制缓存的 Layer，不需要重绘自身内容
    if (this.isRepaintBoundary) {
      this.owner?.schedulePaintFor(this);
      if (this.runtime) {
        this.runtime.scheduleUpdate(this);
      }
      return;
    }

    if (this.parent) {
      this.parent.markNeedsPaint();
      return;
    }

    if (this.runtime) {
      this.runtime.scheduleUpdate(this);
    }
  }

  /**
   * 检查是否需要重绘
   */
  public isPaintDirty(): boolean {
    return this._needsPaint;
  }

  /**
   * 更新 RepaintBoundary 图层
   * 仅对 isRepaintBoundary 为 true 的节点有效
   * 由 PipelineOwner 在 flushPaint 阶段调用
   */
  public updateLayer(): void {
    if (!this.isRepaintBoundary || !this.runtime) {
      return;
    }

    // 获取父节点的全局矩阵作为当前上下文的起始矩阵
    // 注意：TypeScript 允许在类内部访问同类实例的 protected 成员
    // @ts-ignore: 忽略 protected 访问限制（虽然在同类中通常允许，但为了保险起见）
    const parentMatrix = this.parent?._worldMatrix ?? IDENTITY_MATRIX;

    const renderer = this.runtime.getRenderer();
    if (!renderer) {
      return;
    }

    const context: BuildContext = {
      renderer,
      worldMatrix: parentMatrix,
      enableOffscreenRendering: this.runtime.enableOffscreenRendering,
      dirtyRect: undefined,
    };

    this._paintWithLayer(context, 1, false);
  }

  public isDirty(): boolean {
    return this._dirty;
  }

  public clearDirty(): void {
    this._dirty = false;
  }

  public performRebuildAndLayout(): void {
    // 类似于 layout，但复用现有约束
    // 注意：如果 constraints 为 null，说明从未布局过，必须由父级触发
    if (this.renderObject.constraints) {
      this.layout(this.renderObject.constraints);
    }
  }

  public clearPaintDirty(): void {
    this._needsPaint = false;
  }

  public isLayoutDirty(): boolean {
    return this._needsLayout;
  }

  public rebuild(): boolean {
    if (!this._dirty) {
      return false;
    }

    // 假设所有的 props 变更都被 buildChildren 消费
    const stateChanged = this.didStateChange();

    const nextChildrenData = this.computeNextChildrenData();

    const needInitialBuild = this.children.length === 0 && nextChildrenData.length > 0;
    const childrenChanged = this.shallowArrayDiff(this._childrenData, nextChildrenData);

    const hasActualUpdate = needInitialBuild || childrenChanged || stateChanged;
    if (!hasActualUpdate) {
      this._dirty = false;
      return false;
    }

    if (nextChildrenData.length > 0) {
      this.buildChildren(nextChildrenData);
    } else if (this.children.length > 0) {
      this.children = [];
    }

    this._childrenData = nextChildrenData;
    this._dirty = false;
    return true;
  }

  /**
   * 构建方法，类似于 Flutter 的 build 方法
   * 用于创建组件树
   */
  build(_context: BuildContext): Widget {
    // 默认返回自身，子类可以覆盖此方法返回其他组件
    return this;
  }

  protected computeNextChildrenData(): WidgetProps[] {
    const d = this.data.children;
    // 优化：不再默认过滤，假设编译器或输入数据已清洗。
    // 如果存在 null/undefined，将在 buildChildren 中处理或由 compileElement 保证。
    // 这样避免每次 rebuild 都分配新数组。
    return Array.isArray(d) ? (d as WidgetProps[]) : [];
  }

  /**
   * 销毁组件
   * 当组件被移除时调用，用于清理副作用（如 DOM 元素、定时器等）
   */
  dispose(): void {
    const rt = this.runtime ?? null;
    EventRegistry.clearKey(String(this.eventKey), rt);
    this._disposed = true;

    // 清理引用，防止内存泄漏
    this.children = [];
    this.parent = null;
    this.__root = null;
    this._layer = null;
    this._runtime = undefined;
    this._owner = undefined;
    this.ref = undefined;
    this._cachedBoundingBox = null;
    this._inverseWorldMatrix = null;

    // 对象池回收
    let pool = Widget._pool.get(this.type);
    if (!pool) {
      pool = [];
      Widget._pool.set(this.type, pool);
    }
    if (pool.length < 200) {
      pool.push(this);
    }
  }

  public isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * 构建子组件
   */
  protected buildChildren(childrenData: WidgetProps[]): void {
    const prev = this.children;
    let nextChildren: Widget[] | null = null;
    let i = 0;

    // 优化：快速路径，处理头部相同的节点
    for (; i < prev.length && i < childrenData.length; i++) {
      const prevChild = prev[i];
      const childData = childrenData[i];
      const nextType = resolveWidgetTypeForData(childData);
      if (!nextType) {
        break;
      }

      const prevKey = prevChild.data.key;
      const nextKey = childData.key;

      let match = false;
      if (prevChild.type === nextType) {
        if (nextKey != null) {
          match = prevKey === nextKey;
        } else {
          match = prevKey == null;
        }
      }

      if (!match) {
        break;
      }

      // 复用节点
      if (!prevChild._isReused) {
        prevChild._isReused = true;
      }
      // 优化：直接使用新数据，避免对象合并开销
      // React 模型中新 Props 总是完全替换旧 Props
      const nextData = childData as TData;
      prevChild.createElement(nextData);
      prevChild.parent = this;
      prevChild.depth = this.depth + 1;
      // nextChildren.push(prevChild); // 延迟推入
      DOMEventManager.bindEvents(prevChild, childData);
    }

    // 如果完全匹配，直接返回（处理剩余的清理工作）
    if (i === childrenData.length && i === prev.length) {
      // 重置标志位
      for (let j = 0; j < prev.length; j++) {
        prev[j]._isReused = false;
      }
      // this.children 保持不变，无需重新赋值
      return;
    }

    // 初始化 nextChildren 并填充已复用的节点
    nextChildren = new Array(i);
    for (let k = 0; k < i; k++) {
      nextChildren[k] = prev[k];
    }

    let byKey: Map<string, Widget>;
    let prevNoKey: Map<string, Widget[]>;
    let useCache = false;

    // 尝试获取静态缓存（加锁防止递归冲突）
    if (!Widget._buildCache.locked) {
      Widget._buildCache.locked = true;
      byKey = Widget._buildCache.byKey;
      prevNoKey = Widget._buildCache.prevNoKey;
      byKey.clear();
      prevNoKey.clear();
      useCache = true;
    } else {
      // 降级策略：如果缓存被占用（递归调用中），则创建新 Map
      byKey = new Map();
      prevNoKey = new Map();
    }

    try {
      // 仅处理剩余的旧节点
      for (let j = i; j < prev.length; j++) {
        const c = prev[j];
        if (c.data.key) {
          byKey.set(c.key, c);
        } else {
          const type = c.type;
          let list = prevNoKey.get(type);
          if (!list) {
            list = [];
            prevNoKey.set(type, list);
          }
          list.push(c);
        }
      }

      // 为了保持顺序复用（FIFO），我们将数组反转，这样 pop() 就能拿到最早的节点
      // 优化：直接迭代 values 避免 Array.from 产生的临时数组
      for (const list of prevNoKey.values()) {
        list.reverse();
      }

      const seenNextKeys = new Map<unknown, number>();
      const reportedNextKeys = new Set<unknown>();
      for (let j = 0; j < i; j++) {
        const k = (childrenData[j] as unknown as { key?: unknown }).key;
        if (k == null) {
          continue;
        }
        const firstIndex = seenNextKeys.get(k);
        if (firstIndex != null && !reportedNextKeys.has(k)) {
          reportedNextKeys.add(k);
          console.error(
            `[构建错误] 组件 ${this.type}(${String(this.key)}) 的同级子节点存在重复 key：${String(
              k,
            )}（索引 ${firstIndex} 与 ${j}）`,
          );
        } else if (firstIndex == null) {
          seenNextKeys.set(k, j);
        }
      }

      // 仅处理剩余的新节点
      for (let j = i; j < childrenData.length; j++) {
        const childData = childrenData[j];
        // 优化：移除 String() 转换，直接使用原始 Key
        // 1. 避免字符串转换开销
        // 2. 支持数字类型的 Key 复用
        const k = childData.key;
        let reuse: Widget | null = null;

        if (k != null) {
          const firstIndex = seenNextKeys.get(k);
          if (firstIndex != null && !reportedNextKeys.has(k)) {
            reportedNextKeys.add(k);
            console.error(
              `[构建错误] 组件 ${this.type}(${String(this.key)}) 的同级子节点存在重复 key：${String(
                k,
              )}（索引 ${firstIndex} 与 ${j}）`,
            );
          } else if (firstIndex == null) {
            seenNextKeys.set(k, j);
          }
          // @ts-ignore - Map supports any key type
          reuse = byKey.get(k) ?? null;
        } else {
          // 尝试复用同类型的无 key 节点
          const nextType = resolveWidgetTypeForData(childData);
          if (nextType) {
            const list = prevNoKey.get(nextType);
            if (list && list.length > 0) {
              reuse = list.pop()!;
            }
          }
        }

        const nextType = resolveWidgetTypeForData(childData);
        if (reuse && nextType && reuse.type === nextType) {
          // 复用已有节点：合并已有动态数据以保留增量更新结果
          if (!reuse._isReused) {
            reuse._isReused = true;
          }
          // 优化：直接使用新数据
          const nextData = childData as TData;
          reuse.createElement(nextData);
          reuse.parent = this;
          reuse.depth = this.depth + 1;
          nextChildren.push(reuse);
          DOMEventManager.bindEvents(reuse, childData);
        } else {
          const childWidget = this.createChildWidget(childData);
          if (childWidget) {
            childWidget.parent = this;
            childWidget.depth = this.depth + 1;
            childWidget.createElement(childData);
            nextChildren.push(childWidget);
            DOMEventManager.bindEvents(childWidget, childData);
          } else {
            const type = nextType ?? resolveWidgetTypeForData(childData) ?? '未知';
            console.warn(`[构建警告] 创建 '${type}' 类型的子组件失败。` + `可能未注册该组件。`);
          }
        }
      }

      // 销毁未复用的旧节点
      for (const c of prev) {
        if (!c._isReused) {
          c.dispose();
        } else {
          c._isReused = false; // 重置标志位
        }
      }

      // 检测子组件结构是否发生变化
      const childrenStructureChanged =
        prev.length !== nextChildren.length || prev.some((c, i) => c !== nextChildren[i]);

      // 替换 children 引用（删除未复用的旧节点）
      this.children = nextChildren;

      if (childrenStructureChanged) {
        this.markNeedsLayout();
      }

      // 构建后验证
      if (this.children.length !== childrenData.length) {
        console.warn(
          `[构建检查] 组件 ${this.type}(${this.key}) 预期包含 ${childrenData.length} 个子节点，` +
            `但实际得到 ${this.children.length} 个。`,
        );
      }
    } finally {
      if (useCache) {
        // 释放缓存锁并清理引用，防止内存泄漏
        byKey.clear();
        prevNoKey.clear();
        Widget._buildCache.locked = false;
      }
    }
  }

  /**
   * 创建子组件的抽象方法，由子类实现
   *
   * @description
   * 根据 `childData` 创建对应的 Widget 实例。
   * 优先尝试从对象池 (`Widget._pool`) 中获取已回收的实例，
   * 如果池为空，则创建新实例。
   *
   * @param childData 子组件的属性数据
   * @returns 创建的 Widget 实例，如果类型未定义则返回 null
   */
  protected createChildWidget(childData: WidgetProps): Widget | null {
    const type = resolveWidgetTypeForData(childData);
    if (!type) {
      console.warn(`[构建警告] 创建子组件失败。` + `子组件类型未定义。`);
      return null;
    }
    // 尝试从对象池获取
    const pool = Widget._pool.get(type);
    if (pool && pool.length > 0) {
      const w = pool.pop()!;
      w.init(childData);
      const reused = w as unknown as Widget<WidgetProps>;
      const resetData: WidgetProps = { __inkwellType: type, key: childData.key };
      const resetProps: WidgetCompactProps<WidgetProps> = { ...resetData, children: [] };
      reused.data = resetData;
      reused.props = resetProps;
      return w;
    }
    return WidgetRegistry.createWidget(childData);
  }

  // 挂在根节点
  public get root(): Widget | null {
    if (
      this.__root &&
      !this.__root.parent /* 若存在父节点，说明缓存失效（如在节点创建但未挂载时访问了 root） */
    ) {
      return this.__root;
    }
    this.__root = this.findRootFrom(this);
    return this.__root;
  }

  private findRootFrom(node: Widget | null): Widget | null {
    let cur: Widget | null = node;
    while (cur && cur.parent) {
      cur = cur.parent;
      if (cur.__root) {
        return cur.__root;
      }
    }
    return cur;
  }

  // 挂在运行时
  /**
   * 获取关联的运行时实例
   * 如果当前节点没有直接绑定运行时，会尝试从根节点获取
   */
  public get runtime(): Runtime | undefined {
    if (this._runtime) {
      return this._runtime;
    }
    // 尝试从根节点获取（避免递归调用 getter 导致死循环，直接访问私有变量）
    const root = this.root;
    if (root && root !== this) {
      this._runtime = root._runtime;
    }
    return this._runtime;
  }

  /**
   * 设置运行时实例
   * 通常仅由 Runtime 类在根节点上调用
   */
  public set runtime(value: Runtime | undefined) {
    this._runtime = value;
  }

  /**
   * 用于更新组件的属性和子组件
   * 如果是创建子元素，请调用createChildWidget
   */
  createElement(data: TData): Widget {
    this.ensureInitWidget(data);
    const wasBuilt = this._isBuilt;
    this._isBuilt = true;

    const nextData = data;
    const prevData = this.data;
    const propsChanged = this.shallowDiff(prevData, nextData);

    if (!this.parent) {
      DOMEventManager.bindEvents(this, nextData);
    }

    this.data = nextData;
    this.zIndex = typeof nextData.zIndex === 'number' ? (nextData.zIndex as number) : this.zIndex;

    const pe = nextData.pointerEvent ?? 'auto';
    this.pointerEvent = pe;

    this.cursor = nextData.cursor;

    // RepaintBoundary 相关
    if (typeof (nextData as { isRepaintBoundary?: unknown }).isRepaintBoundary !== 'undefined') {
      this.isRepaintBoundary = !!(nextData as { isRepaintBoundary?: unknown }).isRepaintBoundary;
    }

    const isComposite = WidgetRegistry.isCompositeType(this.type);
    if (!isComposite) {
      const slotChildren = Array.isArray(nextData.children)
        ? (nextData.children as WidgetProps[])
        : [];
      this.props = Object.assign({}, nextData) as unknown as WidgetCompactProps<TData>;
      this.props.children = slotChildren as unknown as WidgetCompactProps<TData>['children'];
    }

    const nextChildrenData = isComposite
      ? Array.isArray(nextData.children)
        ? (nextData.children as WidgetProps[])
        : []
      : this.computeNextChildrenData();
    const needInitialBuild = this.children.length === 0 && nextChildrenData.length > 0;
    const childrenChanged = this.shallowArrayDiff(this._childrenData, nextChildrenData);

    if (wasBuilt && !propsChanged && !needInitialBuild && !childrenChanged) {
      return this;
    }

    if (needInitialBuild || childrenChanged) {
      if (nextChildrenData.length > 0) {
        this.buildChildren(nextChildrenData);
      } else if (this.children.length > 0) {
        this.children = [];
      }
      this._childrenData = nextChildrenData;
    }

    // 处理 ref 绑定
    if (this.ref) {
      if (typeof this.ref === 'function') {
        this.ref(this);
      } else if (typeof this.ref === 'object') {
        this.ref.current = this;
      }
    }

    if (propsChanged) {
      if (!this._suppressDidUpdateWidget) {
        this.didUpdateWidget(prevData);
      }
      this._suppressDidUpdateWidget = false;
    }

    return this;
  }

  /**
   * 当组件配置发生变化时调用
   * 默认行为是标记需要重新布局
   * 子类可以覆盖此方法以实现更精细的更新逻辑（例如只标记重绘）
   */
  protected didUpdateWidget(_oldProps: TData): void {
    this.markNeedsLayout();
  }

  /**
   * 布局组件及其子组件
   * 类似于 Flutter 的 layout 方法
   *
   * @description
   * 此方法负责计算组件及其子组件的布局信息。它首先验证组件状态，
   * 然后检查是否可以使用缓存的布局结果。如果需要重新布局，它会
   * 确定重布局边界，调用 `layoutChildren` 和 `performLayout`，
   * 最后调用 `positionChildren` 完成布局。
   *
   * @param constraints 父组件传递的布局约束
   * @returns 组件的最终尺寸 (Size)
   * @throws Error 如果在布局前子节点尚未构建
   */
  layout(constraints: BoxConstraints): Size {
    // 验证：确保在布局前子节点已构建（若存在子节点数据）
    if (!this._isBuilt && Array.isArray(this.data.children) && this.data.children.length > 0) {
      throw new Error('布局前必须先构建子节点');
    }

    // 优化：如果不需要重新布局且约束未改变，直接返回缓存尺寸
    if (
      !this._needsLayout &&
      this.renderObject.constraints &&
      areConstraintsEqual(this.renderObject.constraints, constraints)
    ) {
      return this.renderObject.size;
    }

    this.renderObject.constraints = constraints;

    // 确定重布局边界 (Relayout Boundary)
    // 如果约束是严格的 (tight)，我们可以作为一个重布局边界
    // 这意味着我们的尺寸完全由父级决定，子级的变化不会影响父级
    if (!this.parent || (this.parent && isTight(constraints))) {
      this._relayoutBoundary = this;
    } else {
      this._relayoutBoundary = this.parent?._relayoutBoundary || null;
    }

    // 首先布局子组件（只计算尺寸，不设置位置）
    const childrenSizes = this.layoutChildren(constraints);

    // 根据子组件布局结果计算自身布局
    const size = this.performLayout(constraints, childrenSizes);
    this.renderObject.size = size;
    // 缓存失效
    this._cachedBoundingBox = null;

    this._needsLayout = false;

    // 现在自身尺寸已确定，可以正确定位子组件
    this.positionChildren(childrenSizes);

    return size;
  }

  /**
   * 布局子组件（只计算尺寸，不设置位置）
   */
  protected layoutChildren(parentConstraints: BoxConstraints): Size[] {
    const sizes: Size[] = [];

    // 为每个子组件计算布局约束并执行布局
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const childConstraints = this.getConstraintsForChild(parentConstraints, i);
      const childSize = child.layout(childConstraints);
      sizes.push(childSize);
    }

    return sizes;
  }

  /**
   * 定位子组件（在自身尺寸确定后调用）
   */
  protected positionChildren(childrenSizes: Size[]): void {
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const childSize = childrenSizes[i];
      const childOffset = this.positionChild(i, childSize);
      child.renderObject.offset.dx = childOffset.dx;
      child.renderObject.offset.dy = childOffset.dy;
    }
  }

  /**
   * 获取子组件的约束
   */
  protected getConstraintsForChild(
    constraints: BoxConstraints,
    _childIndex: number,
  ): BoxConstraints {
    // 默认实现，可由子类覆盖
    return constraints;
  }

  /**
   * 定位子组件
   */
  protected positionChild(_childIndex: number, _childSize: Size): Offset {
    // 默认实现，可由子类覆盖
    // 默认将子组件放在 (0,0) 位置
    return { dx: 0, dy: 0 };
  }

  /**
   * 执行布局计算
   */
  protected performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size {
    return { width: 0, height: 0 };
  }

  /**
   * 绘制组件及其子组件
   */
  paint(context: BuildContext): void {
    const parentOpacity = typeof context.opacity === 'number' ? context.opacity : 1;
    let selfOpacity = typeof this.props.opacity === 'number' ? (this.props.opacity as number) : 1;
    if (!isFinite(selfOpacity)) {
      selfOpacity = 1;
    }
    if (selfOpacity < 0) {
      selfOpacity = 0;
    } else if (selfOpacity > 1) {
      selfOpacity = 1;
    }
    const nextOpacity = parentOpacity * selfOpacity;
    const nextContext =
      nextOpacity === parentOpacity ? context : { ...context, opacity: nextOpacity };

    // 脏区域剔除 (Culling)
    if (context.dirtyRect) {
      // 计算当前的世界矩阵
      const steps = this.getSelfTransformSteps();
      const parentMatrix = context.worldMatrix ?? IDENTITY_MATRIX;
      const currentMatrix =
        steps.length === 1 && steps[0].t === 'translate'
          ? multiplyTranslate(parentMatrix, steps[0].x, steps[0].y)
          : multiply(parentMatrix, composeSteps(steps));

      const bounds = this.getBoundingBox(currentMatrix);
      const dr = context.dirtyRect;

      // 简单的 AABB 碰撞检测
      const noIntersection =
        bounds.x > dr.x + dr.width ||
        bounds.x + bounds.width < dr.x ||
        bounds.y > dr.y + dr.height ||
        bounds.y + bounds.height < dr.y;

      if (noIntersection) {
        return;
      }
    }

    if (this.isRepaintBoundary && context.enableOffscreenRendering !== false) {
      this._paintWithLayer(context, nextOpacity);
      return;
    }
    this._performPaint(nextContext);
    this._needsPaint = false;
  }

  /**
   * 获取组件的世界坐标包围盒
   * @param matrix 可选，指定使用的变换矩阵。如果不传则使用当前的 _worldMatrix
   */
  getBoundingBox(matrix?: [number, number, number, number, number, number]): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    if (matrix) {
      return this._computeBoundingBox(matrix);
    }
    if (this._cachedBoundingBox) {
      return this._cachedBoundingBox;
    }
    this._cachedBoundingBox = this._computeBoundingBox(this._worldMatrix || IDENTITY_MATRIX);
    return this._cachedBoundingBox;
  }

  private _computeBoundingBox(m: [number, number, number, number, number, number]) {
    const w = this.renderObject.size.width;
    const h = this.renderObject.size.height;

    const p1 = transformPoint(m, { x: 0, y: 0 });
    const p2 = transformPoint(m, { x: w, y: 0 });
    const p3 = transformPoint(m, { x: w, y: h });
    const p4 = transformPoint(m, { x: 0, y: h });

    const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
    const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
    const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
    const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  protected _performPaint(
    context: BuildContext,
    offsetOverride?: { dx: number; dy: number },
  ): void {
    const steps: TransformStep[] = offsetOverride
      ? [{ t: 'translate', x: offsetOverride.dx, y: offsetOverride.dy }]
      : this.getSelfTransformSteps();

    const prev = context.worldMatrix ?? IDENTITY_MATRIX;
    const next =
      steps.length === 0
        ? prev
        : steps.length === 1 && steps[0].t === 'translate'
          ? multiplyTranslate(prev, steps[0].x, steps[0].y)
          : multiply(prev, composeSteps(steps));
    this._worldMatrix = next;
    this._cachedBoundingBox = null;
    this._inverseWorldMatrix = null;

    context.renderer?.save?.();
    if (steps.length !== 0) {
      applySteps(context.renderer, steps);
    }

    if (context.opacity != null && context.opacity !== 1) {
      context.renderer.setGlobalAlpha?.(context.opacity);
    }

    const ctxWithWorld = context.worldMatrix === next ? context : { ...context, worldMatrix: next };
    this.paintSelf(ctxWithWorld);

    const children = this.children;
    const len = children.length;
    if (len === 1) {
      children[0].paint(ctxWithWorld);
    } else if (len > 1) {
      let isNonDecreasing = true;
      let prevZ = children[0].zIndex;
      for (let i = 1; i < len; i++) {
        const z = children[i].zIndex;
        if (z < prevZ) {
          isNonDecreasing = false;
          break;
        }
        prevZ = z;
      }

      if (isNonDecreasing) {
        for (let i = 0; i < len; i++) {
          children[i].paint(ctxWithWorld);
        }
      } else {
        const sorted = children.slice().sort((a, b) => a.zIndex - b.zIndex);
        for (let i = 0; i < sorted.length; i++) {
          sorted[i].paint(ctxWithWorld);
        }
      }
    }

    context.renderer?.restore?.();
  }

  private _paintWithLayer(
    context: BuildContext,
    compositeOpacity: number = 1,
    composite: boolean = true,
  ): void {
    // 1. 计算当前边界的全局矩阵
    const steps = this.getSelfTransformSteps();
    const prev = context.worldMatrix ?? IDENTITY_MATRIX;
    const next =
      steps.length === 1 && steps[0].t === 'translate'
        ? multiplyTranslate(prev, steps[0].x, steps[0].y)
        : multiply(prev, composeSteps(steps));
    this._worldMatrix = next;
    this._cachedBoundingBox = null;
    this._inverseWorldMatrix = null;

    // 2. 按需更新图层
    if (this._needsPaint || !this._layer) {
      const { width, height } = this.renderObject.size;
      const dpr = context.renderer.getResolution ? context.renderer.getResolution() : 1;

      const w = Math.max(1, Math.ceil(width * dpr));
      const h = Math.max(1, Math.ceil(height * dpr));

      if (!this._layer || this._layer.canvas.width !== w || this._layer.canvas.height !== h) {
        const canvas =
          typeof OffscreenCanvas !== 'undefined'
            ? new OffscreenCanvas(w, h)
            : document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        // @ts-ignore
        const ctx = canvas.getContext('2d') as
          | CanvasRenderingContext2D
          | OffscreenCanvasRenderingContext2D;
        this._layer = { canvas, ctx };
      }

      const { canvas, ctx } = this._layer;
      // 清空 Layer
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      // 创建 Layer Renderer
      const LayerRendererClass = context.renderer.constructor as new () => IRenderer;
      const layerRenderer = new LayerRendererClass();
      if (layerRenderer.setContext) {
        layerRenderer.setContext(ctx);
      } else {
        // 降级处理：假设 setContext 存在，如果不存在可能会失败。
        console.warn('渲染器不支持 setContext，RepaintBoundary 可能失效。');
      }

      // 在 Layer 上绘制
      // 使用 next (Global Matrix) 作为 worldMatrix，以便子节点计算正确的全局矩阵
      // 使用 offsetOverride: {0,0} 确保内容绘制在 Layer 原点
      this._performPaint(
        {
          ...context,
          renderer: layerRenderer,
          worldMatrix: next,
          dirtyRect: undefined,
          opacity: 1,
        },
        { dx: 0, dy: 0 },
      );

      ctx.restore();

      this._needsPaint = false;
    } else {
      // Layer 是 clean 的，但我们需要更新子节点的 _worldMatrix
      // 因为父节点可能移动了，导致 next 变了
      this._updateChildrenMatrices(next);
    }

    // 3. 将图层绘制到主上下文
    if (composite) {
      context.renderer.save();
      applySteps(context.renderer, steps);

      if (this._layer) {
        if (compositeOpacity !== 1) {
          context.renderer.setGlobalAlpha?.(compositeOpacity);
        }
        context.renderer.drawImage({
          image: this._layer.canvas,
          x: 0,
          y: 0,
          width: this.renderObject.size.width,
          height: this.renderObject.size.height,
        });
      }

      context.renderer.restore();
    }
  }

  /**
   * 递归更新子节点的世界矩阵（在跳过绘制时使用）
   */
  protected _updateChildrenMatrices(
    parentMatrix: [number, number, number, number, number, number],
  ): void {
    const children = this.children;
    for (const child of children) {
      const steps = child.getSelfTransformSteps();
      const next =
        steps.length === 1 && steps[0].t === 'translate'
          ? multiplyTranslate(parentMatrix, steps[0].x, steps[0].y)
          : multiply(parentMatrix, composeSteps(steps));
      child._worldMatrix = next;
      // @ts-ignore
      child._cachedBoundingBox = null;
      // @ts-ignore
      child._inverseWorldMatrix = null;
      // 递归更新
      child._updateChildrenMatrices(next);
    }
  }

  /**
   * 应用绘制变换
   * 将子组件的坐标变换应用到矩阵中
   * 类似于 Flutter 的 applyPaintTransform
   *
   * @param child 子组件
   * @param transform 变换矩阵 [a, b, c, d, tx, ty]
   */
  applyPaintTransform(child: Widget, transform: number[]): void {
    const offset = child.renderObject.offset;
    if (transform && transform.length === 6) {
      transform[4] += transform[0] * offset.dx + transform[2] * offset.dy;
      transform[5] += transform[1] * offset.dx + transform[3] * offset.dy;
    }
  }

  /**
   * 绘制组件自身
   */
  protected paintSelf(context: BuildContext): void {
    void context;
    // Default do nothing
  }

  protected paintChildren(context: BuildContext): void {
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      // 只有可见才绘制
      // 这里可以做简单的视口剔除优化
      child.paint(context);
    }
  }

  protected didStateChange(): boolean {
    return false;
  }

  /**
   * 获取当前节点距离浏览器原点的绝对位置
   * 用于调试和定位
   */
  getAbsolutePosition(): Offset {
    if (this._worldMatrix) {
      const p = transformPoint(this._worldMatrix, { x: 0, y: 0 });
      return { dx: p.x, dy: p.y };
    }
    let absoluteX = this.renderObject.offset.dx;
    let absoluteY = this.renderObject.offset.dy;
    let currentParent = this.parent;
    while (currentParent) {
      absoluteX += currentParent.renderObject.offset.dx;
      absoluteY += currentParent.renderObject.offset.dy;
      currentParent = currentParent.parent;
    }
    return { dx: absoluteX, dy: absoluteY };
  }

  getWorldMatrix(): [number, number, number, number, number, number] {
    return this._worldMatrix ?? IDENTITY_MATRIX;
  }

  protected getSelfTransformSteps(): TransformStep[] {
    const o = this.renderObject.offset;
    return [{ t: 'translate', x: o.dx, y: o.dy }];
  }

  bringToFront(): void {
    const p = this.parent;
    if (!p) {
      return;
    }
    let maxZ = 0;
    for (const c of p.children) {
      if (c.key !== this.key) {
        maxZ = Math.max(maxZ, c.zIndex);
      }
    }
    this.zIndex = maxZ + 1;
  }

  public hitTest(x: number, y: number): boolean {
    if (this._worldMatrix) {
      if (!this._inverseWorldMatrix) {
        this._inverseWorldMatrix = invert(this._worldMatrix);
      }
      const local = transformPoint(this._inverseWorldMatrix, { x, y });
      const w = this.renderObject.size.width;
      const h = this.renderObject.size.height;
      return local.x >= 0 && local.y >= 0 && local.x <= w && local.y <= h;
    }

    const pos = this.getAbsolutePosition();
    const w = this.renderObject.size.width;
    const h = this.renderObject.size.height;
    return x >= pos.dx && y >= pos.dy && x <= pos.dx + w && y <= pos.dy + h;
  }

  /**
   * 递归命中测试
   */
  public visitHitTest(x: number, y: number): Widget | null {
    if (this.pointerEvent === 'none') {
      return this.hitTestChildren(x, y);
    }

    if (!this.hitTest(x, y)) {
      return null;
    }
    const child = this.hitTestChildren(x, y);
    if (child) {
      return child;
    }
    return this;
  }

  protected hitTestChildren(x: number, y: number): Widget | null {
    // 优化：如果没有使用 zIndex，直接反向遍历即可，避免 slice/reverse/sort 的开销
    let useZIndex = false;
    for (const child of this.children) {
      if (child.zIndex !== 0) {
        useZIndex = true;
        break;
      }
    }

    if (!useZIndex) {
      // 倒序遍历（后添加的优先）
      for (let i = this.children.length - 1; i >= 0; i--) {
        const child = this.children[i];
        const res = child.visitHitTest(x, y);
        if (res) {
          return res;
        }
      }
      return null;
    }

    // 倒序遍历（高 zIndex 优先，同 zIndex 后添加的优先）
    // 注意：需要先反转数组，利用 sort 的稳定性，使得同 zIndex 的元素保持反转后的顺序（即后添加的在前面）
    const children = this.children
      .slice()
      .reverse()
      .sort((a, b) => b.zIndex - a.zIndex);
    for (const child of children) {
      const res = child.visitHitTest(x, y);
      if (res) {
        return res;
      }
    }
    return null;
  }
}
