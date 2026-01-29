/** @jsxImportSource @/utils/compiler */
import { Button } from './button';
import { getDefaultTheme, getDefaultTokens } from './theme';

import type { ThemePalette } from '@/styles/theme';
import type { JSXElement } from '@/utils/compiler/jsx-runtime';

import {
  AlignmentGeometry,
  Column,
  Container,
  CrossAxisAlignment,
  MainAxisAlignment,
  MainAxisSize,
  Row,
  Stack,
  StatefulWidget,
  Text,
  TextAlignVertical,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';

export interface ModalProps extends WidgetProps {
  theme?: ThemePalette;
  open: boolean;
  width?: number;
  title?: string;
  maskClosable?: boolean;
  okText?: string;
  cancelText?: string;
  onOk?: (e: InkwellEvent) => void;
  onCancel?: (e: InkwellEvent) => void;
}

interface ModalState {
  visible: boolean;
  progress: number;
  [key: string]: unknown;
}

class ModalInner extends StatefulWidget<ModalProps, ModalState> {
  protected state: ModalState = { visible: false, progress: 0 };
  private raf: number | null = null;
  private animStart = 0;
  private animFrom = 0;
  private animTo = 0;
  private animDuration = 0;

  private getOverlayEntryKey(): string {
    return `${String(this.key)}-modal-overlay`;
  }

  private syncOverlay(): void {
    const rt = this.runtime;
    if (!rt) {
      return;
    }

    const overlayKey = this.getOverlayEntryKey();
    if (!this.state.visible) {
      rt.removeOverlayEntry(overlayKey);
      return;
    }

    const theme = getDefaultTheme(this.props.theme);
    const tokens = getDefaultTokens();

    const dialogW = this.props.width ?? 520;
    const progress = this.state.progress;
    const maskAlpha = 0.45 * progress;
    const maskColor = `rgba(0, 0, 0, ${maskAlpha})`;
    const slide = (1 - progress) * 24;

    rt.setOverlayEntry(
      overlayKey,
      <Stack
        key={`${overlayKey}-host`}
        allowOverflowPositioned={true}
        alignment={AlignmentGeometry.Center}
      >
        <Container
          key={`${overlayKey}-mask`}
          alignment="topLeft"
          color={maskColor}
          pointerEvent="auto"
          onPointerDown={(e: InkwellEvent) => {
            e.stopPropagation?.();
            if (this.props.maskClosable !== false) {
              this.props.onCancel?.(e);
            }
          }}
        />
        <Container
          key={`${overlayKey}-dialog`}
          width={dialogW}
          minWidth={320}
          minHeight={160}
          borderRadius={tokens.borderRadius}
          border={{ width: tokens.borderWidth, color: theme.border.base }}
          color={theme.background.container}
          padding={16}
          margin={{ bottom: slide }}
          pointerEvent="auto"
        >
          <Column
            spacing={12}
            crossAxisAlignment={CrossAxisAlignment.Start}
            mainAxisSize={MainAxisSize.Min}
          >
            {this.props.title ? (
              <Text
                key="modal-title"
                text={this.props.title}
                fontSize={16}
                color={theme.text.primary}
                lineHeight={24}
                fontWeight="bold"
                pointerEvent="none"
              />
            ) : null}
            <Container key="modal-body" pointerEvent="auto">
              {this.props.children as unknown as WidgetProps[]}
            </Container>
            <Row
              key="modal-footer"
              spacing={8}
              mainAxisAlignment={MainAxisAlignment.End}
              crossAxisAlignment={CrossAxisAlignment.Center}
            >
              <Button theme={theme} btnType="default" onClick={(e) => this.props.onCancel?.(e)}>
                <Text
                  text={this.props.cancelText ?? '取消'}
                  fontSize={14}
                  color={theme.text.primary}
                  textAlignVertical={TextAlignVertical.Center}
                  pointerEvent="none"
                />
              </Button>
              <Button theme={theme} btnType="primary" onClick={(e) => this.props.onOk?.(e)}>
                <Text
                  text={this.props.okText ?? '确定'}
                  fontSize={14}
                  color={theme.text.inverse}
                  textAlignVertical={TextAlignVertical.Center}
                  pointerEvent="none"
                />
              </Button>
            </Row>
          </Column>
        </Container>
      </Stack>,
    );
  }

  protected override initWidget(data: ModalProps) {
    super.initWidget(data);
    if (data.open) {
      this.state.visible = true;
      this.state.progress = 0;
      this.startAnim(0, 1, 180);
    } else {
      this.state.visible = false;
      this.state.progress = 0;
    }
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => this.syncOverlay());
    } else {
      void Promise.resolve().then(() => this.syncOverlay());
    }
  }

  protected override didUpdateWidget(oldProps: ModalProps): void {
    const nextOpen = this.props.open;
    const prevOpen = oldProps.open;
    if (nextOpen === prevOpen) {
      return;
    }
    if (nextOpen) {
      this.setState({ visible: true, progress: 0 });
      this.startAnim(0, 1, 180);
      this.syncOverlay();
    } else {
      if (this.state.visible) {
        this.startAnim(this.state.progress, 0, 160, () => {
          this.setState({ visible: false, progress: 0 });
          this.syncOverlay();
        });
      }
    }
  }

  override dispose(): void {
    if (typeof cancelAnimationFrame === 'function' && this.raf !== null) {
      cancelAnimationFrame(this.raf);
    }
    this.raf = null;
    const rt = this.runtime;
    if (rt) {
      rt.removeOverlayEntry(this.getOverlayEntryKey());
    }
    super.dispose();
  }

  private startAnim(from: number, to: number, duration: number, onDone?: () => void): void {
    if (typeof requestAnimationFrame !== 'function') {
      this.setState({ progress: to });
      this.syncOverlay();
      if (to === 0) {
        onDone?.();
      }
      return;
    }
    if (typeof cancelAnimationFrame === 'function' && this.raf !== null) {
      cancelAnimationFrame(this.raf);
    }
    this.animStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.animFrom = from;
    this.animTo = to;
    this.animDuration = Math.max(1, duration);

    const step = (ts: number) => {
      if (this._disposed) {
        this.raf = null;
        return;
      }
      const t = Math.max(0, Math.min(1, (ts - this.animStart) / this.animDuration));
      const eased = 1 - Math.pow(1 - t, 3);
      const next = this.animFrom + (this.animTo - this.animFrom) * eased;
      this.setState({ progress: next });
      this.syncOverlay();
      if (t >= 1) {
        this.raf = null;
        if (this.animTo === 0) {
          onDone?.();
        }
        return;
      }
      this.raf = requestAnimationFrame(step);
    };

    this.raf = requestAnimationFrame(step);
  }

  protected render() {
    if (!this.state.visible) {
      return <Container key={this.key} width={0} height={0} pointerEvent="none" />;
    }
    this.syncOverlay();
    return <Container key={this.key} width={0} height={0} pointerEvent="none" />;
  }
}

export function Modal(props: ModalProps) {
  const { key, ...rest } = props;
  const el: JSXElement = {
    type: ModalInner,
    props: rest as unknown as Record<string, unknown>,
    key: (key ?? null) as string | number | null,
  };
  return el;
}
