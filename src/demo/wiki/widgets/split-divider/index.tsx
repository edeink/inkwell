/** @jsxImportSource @/utils/compiler */
import type { SplitDividerProps } from '../types';

import { Container, type InkwellEvent } from '@/core';

export class SplitDivider extends Container {
  private dragging = false;
  private startClientX = 0;
  private startWidth = 0;
  private activePointerId: number | null = null;

  private windowMoveHandler: ((ev: PointerEvent) => void) | null = null;
  private windowUpHandler: ((ev: PointerEvent) => void) | null = null;

  constructor(props: SplitDividerProps) {
    super(props);
  }

  private attachWindowPointerListeners(native?: Event): void {
    const pe = native as PointerEvent | undefined;
    this.activePointerId = typeof pe?.pointerId === 'number' ? pe.pointerId : null;
    if (!this.windowMoveHandler) {
      this.windowMoveHandler = (ev: PointerEvent) => {
        if (!this.dragging) {
          return;
        }
        if (this.activePointerId != null && ev.pointerId !== this.activePointerId) {
          return;
        }
        const props = this.props as unknown as SplitDividerProps;
        const dx = ev.clientX - this.startClientX;
        const next = Math.max(props.minWidth, Math.min(props.maxWidth, this.startWidth + dx));
        props.onResize(next);
      };
    }
    if (!this.windowUpHandler) {
      this.windowUpHandler = (ev: PointerEvent) => {
        if (this.activePointerId != null && ev.pointerId !== this.activePointerId) {
          return;
        }
        this.dragging = false;
        this.detachWindowPointerListeners();
      };
    }
    window.addEventListener('pointermove', this.windowMoveHandler as EventListener, {
      capture: true,
    });
    window.addEventListener('pointerup', this.windowUpHandler as EventListener, {
      capture: true,
    });
  }

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

  override dispose(): void {
    this.detachWindowPointerListeners();
    super.dispose();
  }

  onPointerDown(e: InkwellEvent) {
    const props = this.props as unknown as SplitDividerProps;
    this.dragging = true;
    this.startWidth = props.sidebarWidth;
    this.startClientX = (e.nativeEvent as PointerEvent).clientX || 0;
    this.attachWindowPointerListeners(e.nativeEvent as Event);
    e.stopPropagation?.();
    return false;
  }

  render() {
    const props = this.props as unknown as SplitDividerProps;
    return (
      <Container
        width={props.width}
        height={props.height}
        cursor="col-resize"
        color="transparent"
        alignment="center"
        onPointerDown={this.onPointerDown.bind(this)}
      >
        <Container
          width={1}
          height={props.height}
          color={props.theme.border.base}
          pointerEvent="none"
        />
      </Container>
    );
  }
}
