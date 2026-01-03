import { toEventType } from './events/helper';
import { EventRegistry } from './events/registry';
import {
  applySteps,
  composeSteps,
  IDENTITY_MATRIX,
  invert,
  multiply,
  transformPoint,
  type TransformStep,
} from './helper/transform';
import { WidgetRegistry } from './registry';
import {
  type BoxConstraints,
  type BuildContext,
  type CursorType,
  type EventHandler,
  type FlexProperties,
  type Offset,
  type PointerEvents,
  type Ref,
  type Size,
  type WidgetEventHandler,
  type WidgetProps,
} from './type';

import type { PipelineOwner } from './pipeline/owner';
import type { RenderObject } from './type';
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
export type WidgetCompactProps<T extends WidgetProps, C = Widget[]> = {
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
  key: string;
  type: string;
  children: Widget[] = [];
  parent: Widget | null = null;
  // 编译 JSX 得到的数据
  data: TData;
  // 为了兼容 React 用法，构造的属性
  props: WidgetCompactProps<TData>;
  // base 不维护状态
  flex: FlexProperties; // 添加flex属性
  depth: number = 0;
  renderObject: RenderObject = {
    offset: { dx: 0, dy: 0 },
    size: { width: 0, height: 0 },
  };
  zIndex: number = 0;
  /**
   * 是否跳过事件检测 (点击穿透)
   * 如果为 true，则该组件不响应点击，但事件会传递给子组件
   */
  skipEvent: boolean = false;
  /**
   * 指针事件控制
   * 类似于 CSS pointer-events
   */
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
  protected _worldMatrix?: [number, number, number, number, number, number];

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

  public get owner(): PipelineOwner | undefined {
    return this._owner ?? this.runtime?.pipelineOwner;
  }

  public set owner(v: PipelineOwner | undefined) {
    this._owner = v;
  }

  // 自动 Key 生成计数器
  private static _keyCounters: Map<string, number> = new Map();

  /**
   * 生成唯一 Key
   * @param type 组件类型
   * @returns 唯一的 Key 字符串
   */
  private static _generateKey(type: string): string {
    const count = (Widget._keyCounters.get(type) || 0) + 1;
    Widget._keyCounters.set(type, count);
    return `${type}-${count}`;
  }

  constructor(data: TData) {
    if (!data) {
      throw new Error('组件数据不能为空');
    }
    if (!data.type) {
      throw new Error('组件数据必须包含 type 属性');
    }

    // 如果未提供 key，则自动生成唯一且可读的 key
    this.key = data.key || Widget._generateKey(data.type);
    this.type = data.type;
    // 编译 JSX 得到的数据
    this.data = data;
    // 实际运行的 props
    this.props = { ...data, children: [] /** 未初始化 */ } as unknown as WidgetCompactProps<TData>;
    this.flex = data.flex || {}; // 初始化flex属性
    this.zIndex = typeof data.zIndex === 'number' ? (data.zIndex as number) : 0;

    this.skipEvent = !!data.skipEvent;
    // 优先使用 pointerEvent，其次 pointerEvents，默认为 auto
    const pe = data.pointerEvent ?? 'auto';
    this.pointerEvent = pe;

    this.cursor = data.cursor;
    this.ref = data.ref;
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
    const ka = Object.keys(a).filter((k) => k !== 'children');
    const kb = Object.keys(b).filter((k) => k !== 'children');
    if (ka.length !== kb.length) {
      return true;
    }
    for (const k of ka) {
      if (a[k] !== b[k]) {
        return true;
      }
    }
    return false;
  }

  private shallowArrayDiff(
    prevArray: Record<string, unknown>[],
    nextArray: Record<string, unknown>[],
  ): boolean {
    const prevKeys = prevArray.map((c) => String(c.key ?? ''));
    const nextKeys = nextArray.map((c) => String(c.key ?? ''));
    if (prevKeys.length !== nextKeys.length) {
      return true;
    }
    for (let i = 0; i < prevKeys.length; i++) {
      if (prevKeys[i] !== nextKeys[i]) {
        return true;
      }
    }
    if (prevArray.length !== nextArray.length) {
      return true;
    }
    for (let i = 0; i < nextArray.length; i++) {
      const a = prevArray[i];
      const b = nextArray[i];
      if (!a || !b) {
        return true;
      }
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
    if (this._needsLayout) {
      return;
    }
    this._needsLayout = true;
    this.markNeedsPaint();

    if (this._relayoutBoundary !== this) {
      this.markParentNeedsLayout();
    } else {
      if (this.owner) {
        this.owner.scheduleLayoutFor(this);
      }
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

    // 通知 Runtime 调度更新（如果需要）
    if (this.runtime) {
      this.runtime.scheduleUpdate(this);
    }

    // 如果是绘制边界，则无需向上传播
    // 因为父级只需要绘制缓存的 Layer，不需要重绘自身内容
    if (this.isRepaintBoundary) {
      return;
    }

    if (this.parent) {
      this.parent.markNeedsPaint();
    }
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

    const prevData = this.data;
    const prevChildrenData = Array.isArray(prevData.children)
      ? (prevData.children as WidgetProps[])
      : [];
    const nextChildrenData = this.computeNextChildrenData();

    const needInitialBuild = this.children.length === 0 && nextChildrenData.length > 0;
    const childrenChanged = this.shallowArrayDiff(prevChildrenData, nextChildrenData);
    const propsChanged = this.shallowDiff(this.props, { ...prevData, children: nextChildrenData });

    const hasActualUpdate = needInitialBuild || childrenChanged || propsChanged || stateChanged;
    if (!hasActualUpdate) {
      this._dirty = false;
      return false;
    }

    if (nextChildrenData.length > 0) {
      this.buildChildren(nextChildrenData);
    } else if (this.children.length > 0) {
      this.children = [];
    }

    const nextProps = { ...prevData, children: this.children };
    this.data = nextProps;
    this.props = nextProps as unknown as WidgetCompactProps<TData>;
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
    return Array.isArray(d) ? (d.filter((x) => x && typeof x === 'object') as WidgetProps[]) : [];
  }

  /**
   * 销毁组件
   * 当组件被移除时调用，用于清理副作用（如 DOM 元素、定时器等）
   */
  dispose(): void {
    this._disposed = true;
  }

  public isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * 构建子组件
   */
  protected buildChildren(childrenData: WidgetProps[]): void {
    const prev = this.children;
    const byKey = new Map<string, Widget>();
    // 优化：按类型分组存储无 key 节点，实现 O(1) 查找
    const prevNoKey = new Map<string, Widget[]>();

    for (const c of prev) {
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
    for (const list of prevNoKey.values()) {
      list.reverse();
    }

    const nextChildren: Widget[] = [];
    const reused = new Set<Widget>();

    for (const childData of childrenData) {
      const k = childData.key ? String(childData.key) : null;
      let reuse: Widget | null = null;

      if (k) {
        reuse = byKey.get(k) ?? null;
      } else {
        // 尝试复用同类型的无 key 节点
        const type = childData.type;
        if (type) {
          const list = prevNoKey.get(type);
          if (list && list.length > 0) {
            reuse = list.pop()!;
          }
        }
      }

      if (reuse && reuse.type === childData.type) {
        // 复用已有节点：合并已有动态数据以保留增量更新结果
        reused.add(reuse);
        const merged = { ...reuse.data, ...childData };
        reuse.createElement(merged as TData);
        reuse.parent = this;
        reuse.depth = this.depth + 1;
        nextChildren.push(reuse);
        this.bindEventsIfNeeded(reuse, childData);
      } else {
        const childWidget = this.createChildWidget(childData);
        if (childWidget) {
          childWidget.parent = this;
          childWidget.depth = this.depth + 1;
          childWidget.createElement(childData);
          nextChildren.push(childWidget);
          this.bindEventsIfNeeded(childWidget, childData);
        } else {
          console.warn(
            `[构建警告] 创建 '${childData.type}' 类型的子组件失败。` + `可能未注册该组件。`,
          );
        }
      }
    }

    // 销毁未复用的旧节点
    for (const c of prev) {
      if (!reused.has(c)) {
        c.dispose();
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
        `[构建检查] 组件 ${this.type}(${this.key}) 预期包含 ${childrenData.length} 个` +
          `子节点，但实际得到 ${this.children.length} 个。`,
      );
    }
  }

  /**
   * 创建子组件的抽象方法，由子类实现
   */
  protected createChildWidget(childData: WidgetProps): Widget | null {
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
    this._isBuilt = true;

    const nextData = data;
    const prevData = this.data;
    const propsChanged = this.shallowDiff(prevData, nextData);
    const prevChildrenData = Array.isArray(prevData.children)
      ? (prevData.children as WidgetProps[])
      : [];
    const nextChildrenData =
      Array.isArray(nextData.children) && (nextData.children as unknown[]).length > 0
        ? (nextData.children as WidgetProps[])
        : prevChildrenData || [];

    const childrenChanged = this.shallowArrayDiff(prevChildrenData, nextChildrenData);

    if (!this.parent) {
      this.bindEventsIfNeeded(this, nextData);
    }

    const needInitialBuild = this.children.length === 0 && nextChildrenData.length > 0;
    if (!propsChanged && !childrenChanged && !needInitialBuild) {
      // props 不变且 children 结构不变，且无需初始构建：直接返回
      return this;
    }

    this.data = nextData;
    this.zIndex = typeof nextData.zIndex === 'number' ? (nextData.zIndex as number) : this.zIndex;

    this.skipEvent = !!nextData.skipEvent;
    const pe = nextData.pointerEvent ?? 'auto';
    this.pointerEvent = pe;

    this.cursor = nextData.cursor;

    // 初始构建或 children 差异/需要更新时执行子树增量重建
    if (nextChildrenData.length > 0) {
      this.buildChildren(nextChildrenData);
    } else if (this.children.length > 0) {
      this.children = [];
    }

    // 处理 ref 绑定
    if (this.ref) {
      if (typeof this.ref === 'function') {
        this.ref(this);
      } else if (typeof this.ref === 'object') {
        this.ref.current = this;
      }
    }

    // 更新自身 props 引用
    this.props = { ...nextData, children: this.children } as unknown as WidgetCompactProps<TData>;

    if (propsChanged) {
      this.didUpdateWidget(prevData);
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

  private bindEventsIfNeeded = (widget: Widget, data: WidgetProps): void => {
    const rt = this.runtime;
    const skipSelfBind = WidgetRegistry.isCompositeType(widget.type);
    const hasEventFns = Object.entries(data).some(
      ([k, v]) => typeof v === 'function' && /^on[A-Z]/.test(k),
    );
    if (!hasEventFns) {
      return;
    }
    if (skipSelfBind) {
      return;
    }
    EventRegistry.clearKey(String(widget.key), rt);
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'function' && /^on[A-Z]/.test(k)) {
        const base = k.replace(/^on/, '').replace(/Capture$/, '');
        const type = toEventType(base);
        if (type) {
          const capture = /Capture$/.test(k);
          EventRegistry.register(
            String(widget.key),
            type,
            v as EventHandler,
            { capture },
            rt ?? undefined,
          );
        }
      }
    }
  };

  /**
   * 布局组件及其子组件
   * 类似于 Flutter 的 layout 方法
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

    // Determine Relayout Boundary
    // If constraints are tight, we can be a relayout boundary
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
      child.renderObject.offset = childOffset;
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
    // 脏区域剔除 (Culling)
    if (context.dirtyRect) {
      // 计算当前的世界矩阵
      const steps = this.getSelfTransformSteps();
      const local = composeSteps(steps);
      const parentMatrix = context.worldMatrix ?? IDENTITY_MATRIX;
      const currentMatrix = multiply(parentMatrix, local);

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

    if (this.isRepaintBoundary) {
      this._paintWithLayer(context);
      return;
    }
    this._performPaint(context);
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
    const m = matrix || this._worldMatrix || IDENTITY_MATRIX;
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

    const local = composeSteps(steps);
    const prev = context.worldMatrix ?? IDENTITY_MATRIX;
    const next = multiply(prev, local);
    this._worldMatrix = next;

    context.renderer?.save?.();
    applySteps(context.renderer, steps);

    this.paintSelf({ ...context, worldMatrix: next });

    const children = this.children.slice().sort((a, b) => a.zIndex - b.zIndex);
    for (const child of children) {
      child.paint({ ...context, worldMatrix: next });
    }

    context.renderer?.restore?.();
  }

  private _paintWithLayer(context: BuildContext): void {
    // 1. 计算当前边界的全局矩阵
    const steps = this.getSelfTransformSteps();
    const local = composeSteps(steps);
    const prev = context.worldMatrix ?? IDENTITY_MATRIX;
    const next = multiply(prev, local);
    this._worldMatrix = next;

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
        { ...context, renderer: layerRenderer, worldMatrix: next },
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
    context.renderer.save();
    applySteps(context.renderer, steps);

    if (this._layer && typeof context.renderer.drawImage === 'function') {
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

  /**
   * 递归更新子节点的世界矩阵（在跳过绘制时使用）
   */
  protected _updateChildrenMatrices(
    parentMatrix: [number, number, number, number, number, number],
  ): void {
    const children = this.children;
    for (const child of children) {
      const steps = child.getSelfTransformSteps();
      const local = composeSteps(steps);
      const next = multiply(parentMatrix, local);
      child._worldMatrix = next;
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
      const inv = invert(this._worldMatrix);
      const local = transformPoint(inv, { x, y });
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
    if (this.skipEvent) {
      return this.hitTestChildren(x, y);
    }
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
