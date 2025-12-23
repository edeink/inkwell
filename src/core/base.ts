import { toEventType } from './events/helper';
import { EventRegistry } from './events/registry';
import {
  applySteps,
  composeSteps,
  IDENTITY_MATRIX,
  multiply,
  type TransformStep,
} from './helper/transform';
import { WidgetRegistry } from './registry';

import type {
  BoxConstraints,
  BuildContext,
  CursorType,
  EventHandler,
  FlexProperties,
  Offset,
  RenderObject,
  Size,
  WidgetEventHandler,
  WidgetProps,
} from './type';
import type Runtime from '@/runtime';

export type {
  BoxConstraints,
  BuildContext,
  Constraints,
  CursorType,
  FlexProperties,
  Offset,
  RenderObject,
  Size,
  WidgetConstructor,
  WidgetEventHandler,
  WidgetProps,
} from './type';

// 内置的属性
export interface WidgetCompactProps extends Omit<WidgetProps, 'children'>, WidgetEventHandler {
  // 此处为了兼容 React 用法，访问 children 应当返回对象
  children?: Widget[];
}

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
  props: WidgetCompactProps;
  // base 不维护状态
  flex: FlexProperties; // 添加flex属性
  renderObject: RenderObject = {
    offset: { dx: 0, dy: 0 },
    size: { width: 0, height: 0 },
  };
  zIndex: number = 0;
  depth: number = 0;
  pointerEvents: 'auto' | 'none' = 'auto';
  cursor?: CursorType;

  // 根节点
  private __root: Widget | null = null;
  // 运行时挂载点
  public __runtime?: Runtime;
  protected _needsLayout: boolean = false;
  protected _dirty: boolean = true;
  private _worldMatrix: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];

  constructor(data: TData) {
    if (!data) {
      throw new Error('Widget data cannot be null or undefined');
    }
    if (!data.type) {
      throw new Error('Widget data must have a type property');
    }

    this.key = data.key || `widget-${Math.random().toString(36).substr(2, 9)}`;
    this.type = data.type;
    // 编译 JSX 得到的数据
    this.data = data;
    // 实际运行的 props
    this.props = { ...data, children: [] /** 未初始化 */ };
    this.flex = data.flex || {}; // 初始化flex属性
    this.zIndex = typeof data.zIndex === 'number' ? (data.zIndex as number) : 0;
    const pe0 = data.pointerEvents;
    if (pe0 === 'none' || pe0 === 'auto') {
      this.pointerEvents = pe0;
    }
    this.cursor = data.cursor;
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
    }
    return false;
  }

  public markDirty(): void {
    this._dirty = true;
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
    let p: Widget | null = this.parent;
    while (p) {
      if (!p._needsLayout) {
        p._needsLayout = true;
      }
      p = p.parent;
    }
    const rt = this.runtime as
      | Runtime
      | { scheduleUpdate?: (w: Widget) => void; tick?: (ws?: Widget[]) => void }
      | null as
      | Runtime
      | { scheduleUpdate?: (w: Widget) => void; tick?: (ws?: Widget[]) => void }
      | null;
    if (rt && 'scheduleUpdate' in rt && typeof rt.scheduleUpdate === 'function') {
      rt.scheduleUpdate(this);
      return;
    }
    if (rt && 'tick' in rt && typeof rt.tick === 'function') {
      requestAnimationFrame(() => {
        rt.tick?.([this]);
      });
    }
  }

  public isDirty(): boolean {
    return this._dirty;
  }

  public clearDirty(): void {
    this._dirty = false;
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
    // 移除错误的早期返回，因为 props 或 children 变更也需要重建
    // if (!stateChanged) {
    //   this._dirty = false;
    //   return false;
    // }

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
    this.props = nextProps;
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
    // 默认无操作，子类可覆盖
  }

  /**
   * 构建子组件
   */
  protected buildChildren(childrenData: WidgetProps[]): void {
    const prev = this.children;
    const byKey = new Map<string, Widget>();
    // 这里简单实现：优先 key，无 key 则不复用（当前逻辑）。
    const prevNoKey: Widget[] = [];

    for (const c of prev) {
      if (c.data.key) {
        byKey.set(c.key, c);
      } else {
        prevNoKey.push(c);
      }
    }

    const nextChildren: Widget[] = [];
    const reused = new Set<Widget>();

    for (const childData of childrenData) {
      const k = childData.key ? String(childData.key) : null;
      let reuse: Widget | null = null;

      if (k) {
        reuse = byKey.get(k) ?? null;
      } else if (prevNoKey.length > 0) {
        // 尝试复用第一个同类型的无 key 节点
        const idx = prevNoKey.findIndex((w) => w.type === childData.type);
        if (idx !== -1) {
          reuse = prevNoKey[idx];
          prevNoKey.splice(idx, 1);
        }
      }

      if (reuse && reuse.type === childData.type) {
        // 复用已有节点：合并已有动态数据以保留增量更新结果
        reused.add(reuse);
        const merged = { ...reuse.data, ...childData };
        reuse.createElement(merged as TData);
        reuse.parent = this;
        nextChildren.push(reuse);
        this.bindEventsIfNeeded(reuse, childData);
      } else {
        const childWidget = this.createChildWidget(childData);
        if (childWidget) {
          childWidget.parent = this;
          childWidget.createElement(childData);
          nextChildren.push(childWidget);
          this.bindEventsIfNeeded(childWidget, childData);
        } else {
          console.warn(
            `[Build Warning] Failed to create child widget of type '${childData.type}'. ` +
              `It might not be registered.`,
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

    // 替换 children 引用（删除未复用的旧节点）
    this.children = nextChildren;

    // Post-build validation
    if (this.children.length !== childrenData.length) {
      console.warn(
        `[Build Check] Widget ${this.type}(${this.key}) expected ${childrenData.length} ` +
          `children but got ${this.children.length}.`,
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
      !this.__root
        .parent /* 存在父节点，证明缓存错误，如在创建节点未挂载时立马调用 root，会将本节点缓存 */
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
  public get runtime() {
    if (this.__runtime) {
      return this.__runtime;
    }
    this.__runtime = this.root?.__runtime;
    return this.__runtime;
  }

  /**
   * 用于更新组件的属性和子组件
   * 如果是创建子元素，请调用createChildWidget
   */
  createElement(data: TData): Widget {
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
    const pe = nextData.pointerEvents;
    if (pe === 'none' || pe === 'auto') {
      this.pointerEvents = pe;
    }
    this.cursor = nextData.cursor;

    // 初始构建或 children 差异/需要更新时执行子树增量重建
    if (nextChildrenData.length > 0) {
      this.buildChildren(nextChildrenData);
      this.markNeedsLayout();
    } else if (this.children.length > 0) {
      this.children = [];
      this.markNeedsLayout();
    }

    // 更新自身 props 引用
    this.props = { ...nextData, children: this.children };
    return this;
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
    // 此处移除原有的 potentialChildren 检查，因为它会触发 StatelessWidget.render() 导致多余的渲染

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
  protected abstract performLayout(constraints: BoxConstraints, childrenSizes: Size[]): Size;

  /**
   * 绘制组件及其子组件
   */
  paint(context: BuildContext): void {
    const steps = this.getSelfTransformSteps();
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

  /**
   * 绘制组件自身
   */
  protected paintSelf(_context: BuildContext) {
    // 在子组实现
  }

  protected didStateChange(): boolean {
    return false;
  }

  /**
   * 获取当前节点距离浏览器原点的绝对位置
   * 用于调试和定位
   */
  getAbsolutePosition(): Offset {
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
    return this._worldMatrix;
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
    const pos = this.getAbsolutePosition();
    const w = this.renderObject.size.width;
    const h = this.renderObject.size.height;
    return x >= pos.dx && y >= pos.dy && x <= pos.dx + w && y <= pos.dy + h;
  }

  /**
   * 递归命中测试
   */
  public visitHitTest(x: number, y: number): Widget | null {
    if (this.pointerEvents === 'none') {
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
    // 倒序遍历（高 zIndex 优先）
    const children = this.children.slice().sort((a, b) => b.zIndex - a.zIndex);
    for (const child of children) {
      const res = child.visitHitTest(x, y);
      if (res) {
        return res;
      }
    }
    return null;
  }
}
