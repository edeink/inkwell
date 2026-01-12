/** @jsxImportSource @/utils/compiler */

import { CustomComponentType, Side } from '../../type';
import { Connector } from '../connector';

import type { CursorType, WidgetProps } from '@/core/base';
import type { InkwellEvent } from '@/core/events';

import { Container, EditableText, Text } from '@/core';
import { Widget } from '@/core/base';
import { findWidget } from '@/core/helper/widget-selector';
import { StatefulWidget } from '@/core/state/stateful';
import { TextAlign, TextAlignVertical } from '@/core/text';
import Runtime from '@/runtime';
import { Themes, getCurrentThemeMode, type ThemePalette } from '@/styles/theme';

export interface MindMapNodeProps extends WidgetProps {
  title: string;
  prefSide?: Side;
  active?: boolean;
  activeKey?: string | null;
  selected?: boolean;
  enableLayer?: boolean; // 支持 RepaintBoundary 优化
  onActive?: (key: string | null) => void;
  onEdit?: (key: string | null) => void;
  onAddSibling?: (refKey: string, dir: -1 | 1) => void;
  onAddChildSide?: (refKey: string, side: Side) => void;
  onMoveNode?: (key: string, dx: number, dy: number) => void;
  getViewState?: () => { scale: number; tx: number; ty: number };
  isEditing?: boolean;
  isRoot?: boolean;
  theme?: ThemePalette;
  cursorConfig?: {
    normal?: string;
    editing?: string;
    reading?: string;
  };
}

/**
 * MindMapNode
 * 有状态的思维导图节点组件，负责渲染节点外观与处理点击/拖拽/编辑交互
 */
export class MindMapNode extends StatefulWidget<MindMapNodeProps> {
  title: string = '';
  prefSide: Side | undefined = undefined;
  active: boolean = false;
  private _onMoveNode?: (key: string, dx: number, dy: number) => void;
  private dragState: { startX: number; startY: number; origDx: number; origDy: number } | null =
    null;
  private clickCandidate: { startX: number; startY: number } | null = null;
  private dragRaf: number | null = null;
  private windowMoveHandler: ((ev: PointerEvent) => void) | null = null;
  private windowUpHandler: ((ev: PointerEvent) => void) | null = null;
  private activePointerId: number | null = null;

  /**
   * 构造函数
   * 初始化组件状态与静态属性，保留传入的节点数据与业务逻辑
   */
  constructor(data: MindMapNodeProps) {
    super(data);
    this.state = this.initialState(data);
    this.initNode(data);
  }

  /**
   * 初始化状态
   * 从节点数据推导初始标题文本与拖拽标记
   */
  private initialState(data: MindMapNodeProps): MindMapNodeProps {
    return { title: data.title || '', dragging: false, hovering: false };
  }

  private initNode(data: MindMapNodeProps): void {
    this.title = data.title || '';
    this.prefSide = data.prefSide;
    const akFromProps = (data.activeKey ?? null) as string | null;
    const ak = akFromProps;
    this.active = typeof data.active === 'boolean' ? (data.active as boolean) : ak === this.key;
    this._onMoveNode = data.onMoveNode;
    if (data.enableLayer) {
      this.isRepaintBoundary = true;
    }

    if (this.state && this.state.title !== this.title) {
      this.state = {
        ...this.state,
        title: this.title,
      };
    }
  }

  createElement(data: MindMapNodeProps): Widget<MindMapNodeProps> {
    const withEvents = {
      ...data,
      onPointerDown: (e: InkwellEvent) => this.onPointerDown(e),
      onPointerMove: (e: InkwellEvent) => this.onPointerMove(e),
      onPointerUp: (e: InkwellEvent) => this.onPointerUp(e),
      onDblClick: () => this.onDblClick(),
      onPointerEnter: () => this.setState({ hovering: true } as Partial<MindMapNodeProps>),
      onPointerLeave: () => this.setState({ hovering: false } as Partial<MindMapNodeProps>),
    } as MindMapNodeProps;
    super.createElement(withEvents);
    this.initNode(withEvents);
    return this;
  }

  /**
   * 指针按下事件
   * 区分根节点点击与可拖拽节点，记录初始位置并进入拖拽状态
   */
  onPointerDown(e: InkwellEvent): boolean | void {
    const props = this.props as MindMapNodeProps;
    const vs = props.getViewState?.() || { scale: 1, tx: 0, ty: 0 };
    e.stopPropagation();
    if (this.isRootNode()) {
      this.clickCandidate = { startX: e.x, startY: e.y };
      this.detachWindowPointerListeners();
      this.setState({ dragging: false });
      return true;
    }
    const worldX = (e.x - vs.tx) / vs.scale;
    const worldY = (e.y - vs.ty) / vs.scale;
    const offset = this.renderObject.offset || { dx: 0, dy: 0 };
    this.dragState = { startX: worldX, startY: worldY, origDx: offset.dx, origDy: offset.dy };
    this.clickCandidate = { startX: e.x, startY: e.y };
    this.detachWindowPointerListeners();
    this.attachWindowPointerListeners(e.nativeEvent);
    this.setState({ dragging: true });
    return true;
  }

  /**
   * 指针移动事件
   * 在拖拽中更新位移并节流重绘；非拖拽时维护悬停动画进度
   */
  onPointerMove(e: InkwellEvent): boolean | void {
    this.handlePointerMove({ x: e.x, y: e.y, native: e.nativeEvent });
    return false;
  }

  /**
   * 指针抬起事件
   * 结束拖拽并提交位置变更或触发点击激活
   */
  onPointerUp(e: InkwellEvent): boolean | void {
    this.handlePointerUp({ x: e.x, y: e.y, native: e.nativeEvent });
    this.detachWindowPointerListeners();
    this.setState({ dragging: false });
    return false;
  }

  /**
   * 双击进入内联编辑
   * 请求视口进入编辑态并创建原生输入框进行文本编辑
   */
  onDblClick(): boolean | void {
    const props = this.props as MindMapNodeProps;
    if (props.onEdit) {
      props.onEdit(this.key);
    }
    return false;
  }

  /**
   * 基于原生事件坐标反查所属 Runtime
   */
  private findRuntimeFromNative(native?: Event): Runtime | null {
    try {
      const me = native as MouseEvent | PointerEvent | TouchEvent | undefined;
      const x = (me as MouseEvent | PointerEvent | undefined)?.clientX;
      const y = (me as MouseEvent | PointerEvent | undefined)?.clientY;
      if (typeof x !== 'number' || typeof y !== 'number') {
        return null;
      }
      const els = document.elementsFromPoint(x, y);
      for (const el of els) {
        if (el instanceof HTMLCanvasElement) {
          const id = el.dataset.inkwellId || '';
          if (!id) {
            continue;
          }
          const rt = Runtime.getByCanvasId(id);
          if (rt) {
            return rt;
          }
        }
      }
    } catch {}
    return null;
  }

  /**
   * 将原生事件坐标转换为画布坐标
   */
  private toCanvasXY(native?: Event): { x: number; y: number } | null {
    try {
      const m = native as MouseEvent | PointerEvent | TouchEvent | undefined;
      const cx = (m as MouseEvent | PointerEvent | undefined)?.clientX;
      const cy = (m as MouseEvent | PointerEvent | undefined)?.clientY;
      if (typeof cx !== 'number' || typeof cy !== 'number') {
        return null;
      }
      const rt = this.findRuntimeFromNative(native);
      const renderer = rt?.getRenderer?.();
      const raw = renderer?.getRawInstance?.() as CanvasRenderingContext2D | null;
      const canvas = raw?.canvas ?? rt?.container?.querySelector('canvas') ?? null;
      if (!canvas) {
        return null;
      }
      const rect = (canvas as HTMLCanvasElement).getBoundingClientRect();
      const x = cx - rect.left;
      const y = cy - rect.top;
      return { x, y };
    } catch {
      return null;
    }
  }

  /**
   * 监听全局指针事件以支持拖拽越界场景
   */
  private attachWindowPointerListeners(native?: Event): void {
    const pe = native as PointerEvent | undefined;
    this.activePointerId = typeof pe?.pointerId === 'number' ? pe!.pointerId : null;
    if (!this.windowMoveHandler) {
      this.windowMoveHandler = (ev: PointerEvent) => {
        if (this.activePointerId != null && ev.pointerId !== this.activePointerId) {
          return;
        }
        const pt = this.toCanvasXY(ev);
        if (!pt) {
          return;
        }
        this.handlePointerMove({ x: pt.x, y: pt.y, native: ev });
      };
    }
    if (!this.windowUpHandler) {
      this.windowUpHandler = (ev: PointerEvent) => {
        if (this.activePointerId != null && ev.pointerId !== this.activePointerId) {
          return;
        }
        const pt = this.toCanvasXY(ev);
        if (!pt) {
          this.handlePointerUp({ x: 0, y: 0, native: ev });
        } else {
          this.handlePointerUp({ x: pt.x, y: pt.y, native: ev });
        }
        this.detachWindowPointerListeners();
      };
    }
    window.addEventListener('pointermove', this.windowMoveHandler as EventListener, {
      capture: true,
    });
    window.addEventListener('pointerup', this.windowUpHandler as EventListener, { capture: true });
  }

  /**
   * 解除全局指针事件监听，清理拖拽状态
   */
  private detachWindowPointerListeners(): void {
    if (this.windowMoveHandler) {
      window.removeEventListener('pointermove', this.windowMoveHandler as EventListener, {
        capture: true,
      });
    }
    if (this.windowUpHandler) {
      window.removeEventListener('pointerup', this.windowUpHandler as EventListener, {
        capture: true,
      });
    }
    this.windowMoveHandler = null;
    this.windowUpHandler = null;
    this.activePointerId = null;
  }

  /**
   * 处理指针移动
   * 拖拽时更新偏移并节流重绘；非拖拽时维护悬停动画与命中测试
   */
  private handlePointerMove(e: { x: number; y: number; native?: Event }): void {
    const props = this.props as MindMapNodeProps;
    const vs = props.getViewState?.() || { scale: 1, tx: 0, ty: 0 };
    const worldX = (e.x - vs.tx) / vs.scale;
    const worldY = (e.y - vs.ty) / vs.scale;
    if (!this.dragState) {
      return;
    }
    const dx = worldX - this.dragState.startX;
    const dy = worldY - this.dragState.startY;
    this.renderObject.offset = { dx: this.dragState.origDx + dx, dy: this.dragState.origDy + dy };
    if (this.dragRaf == null) {
      this.dragRaf = requestAnimationFrame(() => {
        this.runtime?.rerender();
        this.dragRaf = null;
      });
    }
    if (this.clickCandidate) {
      const d = Math.hypot(e.x - this.clickCandidate.startX, e.y - this.clickCandidate.startY);
      if (d > 3) {
        this.clickCandidate = null;
      }
    }
  }

  /**
   * 处理指针抬起
   * 根据是否发生明显位移决定提交拖拽结果或作为点击激活
   */
  private handlePointerUp(e: { x: number; y: number; native?: Event }): void {
    const props = this.props as MindMapNodeProps;
    const vs = props.getViewState?.() || { scale: 1, tx: 0, ty: 0 };
    const ds = this.dragState;

    const worldX = (e.x - vs.tx) / vs.scale;
    const worldY = (e.y - vs.ty) / vs.scale;
    const moved = !!ds && (Math.abs(worldX - ds.startX) > 5 || Math.abs(worldY - ds.startY) > 5);
    this.dragState = null;
    if (moved) {
      const off = this.renderObject.offset || { dx: 0, dy: 0 };
      if (this._onMoveNode) {
        this._onMoveNode(this.key, off.dx, off.dy);
      } else {
        const t = this as unknown as Widget;
        const p = t.parent as Widget | null;
        const container = p && p.type === CustomComponentType.MindMapNodeToolbar ? p : t;
        container.renderObject.offset = { dx: off.dx, dy: off.dy };
      }
      try {
        const parentContainer = (this.parent as Widget) ?? null;
        const layout =
          parentContainer && parentContainer.type === CustomComponentType.MindMapNodeToolbar
            ? (parentContainer.parent as Widget)
            : (parentContainer as Widget);
        if (layout && layout.type === CustomComponentType.MindMapLayout) {
          const descendants = new Set<string>();
          const seen = new Set<string>();
          const stack: string[] = [this.key as string];
          const collectChildren = (fromKey: string): string[] => {
            const out: string[] = [];
            for (const c of layout.children) {
              if (c instanceof Connector) {
                const from = c.fromKey as string;
                const to = c.toKey as string;
                if (from === fromKey && !seen.has(to)) {
                  out.push(to);
                }
              }
            }
            return out;
          };
          while (stack.length) {
            const curKey = stack.pop()!;
            const children = collectChildren(curKey);
            for (const ck of children) {
              if (seen.has(ck)) {
                continue;
              }
              seen.add(ck);
              descendants.add(ck);
              stack.push(ck);
            }
          }
        }
      } catch {}
      this.markDirty();
      this.clickCandidate = null;
    } else if (this.clickCandidate) {
      if (props.onActive) {
        props.onActive(this.key);
      }
      this.clickCandidate = null;
      this.markDirty();
    }
  }

  /**
   * 向上查找所属视口组件
   */

  /**
   * 判断是否为根节点（不存在指向自身的连接线）
   */
  private isRootNode(): boolean {
    const props = this.props as MindMapNodeProps;
    if (typeof props.isRoot === 'boolean') {
      return props.isRoot;
    }
    const edge = findWidget(this.root, `Connector[toKey="${String(this.key)}"]`);
    return !edge;
  }

  /**
   * 渲染组件树
   * 使用 Container + Text 保持视觉效果与交互绑定，避免直接使用底层绘制方法
   */
  render() {
    const st = this.state as MindMapNodeProps;
    const props = this.props as MindMapNodeProps;
    const theme = props.theme || Themes[getCurrentThemeMode()];
    const editing = props.isEditing;
    const selected = !!props.selected;
    const active = typeof props.active === 'boolean' ? props.active : props.activeKey === this.key;
    this.active = active;
    const isDragging = !!st.dragging;
    const baseFill = editing
      ? theme.state.focus
      : active
        ? theme.state.selected
        : selected
          ? theme.state.selected
          : isDragging
            ? theme.background.container
            : theme.background.container;
    const hover = !!st.hovering;
    const borderColor = editing
      ? theme.primary
      : active
        ? theme.primary
        : hover
          ? theme.primary
          : selected
            ? theme.border.base
            : theme.border.base;
    const borderWidth = active || editing || selected || hover ? 2 : 1;

    // 计算光标样式
    const localConfig: Record<string, string> = props.cursorConfig || {};
    const state = editing ? 'editing' : hover ? 'reading' : 'normal';
    const defaults: Record<string, string> = {
      normal: 'default',
      editing: 'text',
      reading: 'pointer',
    };
    const cursor = (localConfig[state] || defaults[state] || 'default') as CursorType;

    const content = editing ? (
      <EditableText
        key="editor"
        value={st.title}
        fontSize={14}
        color={theme.text.primary}
        selectionColor={theme.state.focus}
        cursorColor={theme.text.primary}
        stopTraversalAt={(node) => node.type === CustomComponentType.MindMapViewport}
        onFinish={(val: string) => {
          this.setState({ title: val });
          if (props.onEdit) {
            props.onEdit(null);
          }
        }}
        onCancel={() => {
          if (props.onEdit) {
            props.onEdit(null);
          }
        }}
        getViewState={props.getViewState}
      />
    ) : (
      <Text
        key={`${String(this.key)}-text`}
        text={st.title || '输入文本'}
        fontSize={st.title ? 14 : 14}
        color={st.title ? theme.text.primary : theme.text.placeholder}
        textAlign={TextAlign.Left}
        textAlignVertical={TextAlignVertical.Top}
        lineHeight={st.title ? undefined : 1.5}
        pointerEvent={'none'}
      />
    );

    return (
      <Container
        key={`${String(this.key)}-box`}
        padding={[12, 8]}
        color={baseFill}
        border={{
          color: borderColor,
          width: borderWidth,
          style: selected && !active && !editing ? 'dashed' : 'solid',
        }}
        borderRadius={8}
        minWidth={80}
        maxWidth={650}
        cursor={cursor}
      >
        {content}
      </Container>
    );
  }
}
