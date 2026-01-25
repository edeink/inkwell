/** @jsxImportSource @/utils/compiler */
import { Button } from './button';
import { getDefaultTheme, getDefaultTokens } from './theme';

import type { ThemePalette } from '@/styles/theme';

import {
  ClipRect,
  Column,
  Container,
  CrossAxisAlignment,
  MainAxisAlignment,
  Positioned,
  Row,
  StatefulWidget,
  Text,
  TextAlignVertical,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';

export interface PopconfirmProps extends WidgetProps {
  theme?: ThemePalette;
  width?: number;
  triggerHeight?: number;
  title: string;
  description?: string;
  okText?: string;
  cancelText?: string;
  disabled?: boolean;
  onConfirm?: (e: InkwellEvent) => void;
  onCancel?: (e: InkwellEvent) => void;
}

interface PopconfirmState {
  opened: boolean;
  [key: string]: unknown;
}

export class Popconfirm extends StatefulWidget<PopconfirmProps, PopconfirmState> {
  protected state: PopconfirmState = { opened: false };

  private getOverlayEntryKey(): string {
    return `${String(this.key)}-popconfirm-overlay`;
  }

  private syncOverlay(): void {
    const rt = this.runtime;
    if (!rt) {
      return;
    }
    const overlayKey = this.getOverlayEntryKey();
    if (!this.state.opened) {
      rt.removeOverlayEntry(overlayKey);
      return;
    }

    const theme = getDefaultTheme(this.props.theme);
    const tokens = getDefaultTokens();
    const panelW = this.props.width ?? 260;
    const gapTop = 8;
    const triggerH = this.props.triggerHeight ?? 32;
    const pos = this.getAbsolutePosition();

    rt.setOverlayEntry(
      overlayKey,
      <Positioned key={overlayKey} left={pos.dx} top={pos.dy + gapTop + triggerH}>
        <ClipRect borderRadius={tokens.borderRadius}>
          <Container
            width={panelW}
            borderRadius={tokens.borderRadius}
            border={{ width: tokens.borderWidth, color: theme.border.base }}
            color={theme.background.container}
            padding={12}
            pointerEvent="auto"
            onPointerLeave={this.closeOpened}
          >
            <Column spacing={8} crossAxisAlignment={CrossAxisAlignment.Start}>
              <Text
                key="pc-title"
                text={this.props.title}
                fontSize={14}
                fontWeight="bold"
                color={theme.text.primary}
                lineHeight={20}
                pointerEvent="none"
              />
              {this.props.description ? (
                <Text
                  key="pc-desc"
                  text={this.props.description}
                  fontSize={12}
                  color={theme.text.secondary}
                  lineHeight={18}
                  pointerEvent="none"
                />
              ) : null}
              <Row
                key="pc-actions"
                spacing={8}
                mainAxisAlignment={MainAxisAlignment.End}
                crossAxisAlignment={CrossAxisAlignment.Center}
              >
                <Button
                  theme={theme}
                  btnType="default"
                  size="small"
                  onClick={(e) => {
                    this.closeOpened();
                    this.props.onCancel?.(e);
                  }}
                >
                  <Text
                    text={this.props.cancelText ?? '取消'}
                    fontSize={12}
                    color={theme.text.primary}
                    textAlignVertical={TextAlignVertical.Center}
                    pointerEvent="none"
                  />
                </Button>
                <Button
                  theme={theme}
                  btnType="primary"
                  size="small"
                  onClick={(e) => {
                    this.closeOpened();
                    this.props.onConfirm?.(e);
                  }}
                >
                  <Text
                    text={this.props.okText ?? '确定'}
                    fontSize={12}
                    color={theme.text.inverse}
                    textAlignVertical={TextAlignVertical.Center}
                    pointerEvent="none"
                  />
                </Button>
              </Row>
            </Column>
          </Container>
        </ClipRect>
      </Positioned>,
    );
  }

  private toggleOpened = (e: InkwellEvent) => {
    if (this.props.disabled) {
      return;
    }
    e.stopPropagation?.();
    this.setState({ opened: !this.state.opened });
    this.syncOverlay();
  };

  private closeOpened = () => {
    if (this.state.opened) {
      this.setState({ opened: false });
      this.syncOverlay();
    }
  };

  override dispose(): void {
    const rt = this.runtime;
    if (rt) {
      rt.removeOverlayEntry(this.getOverlayEntryKey());
    }
    super.dispose();
  }

  render() {
    return (
      <Container key={`${this.key}-trigger`} pointerEvent="auto" onPointerDown={this.toggleOpened}>
        {this.data.children ?? []}
      </Container>
    );
  }
}
