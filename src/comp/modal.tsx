/** @jsxImportSource @/utils/compiler */
import { Button } from './button';
import { getDefaultTheme, getDefaultTokens } from './theme';

import type { ThemePalette } from '@/styles/theme';

import {
  Column,
  Container,
  CrossAxisAlignment,
  MainAxisAlignment,
  Row,
  SizedBox,
  Stack,
  Text,
  TextAlignVertical,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';

export interface ModalProps extends WidgetProps {
  theme?: ThemePalette;
  open: boolean;
  viewportWidth: number;
  viewportHeight: number;
  width?: number;
  title?: string;
  maskClosable?: boolean;
  okText?: string;
  cancelText?: string;
  onOk?: (e: InkwellEvent) => void;
  onCancel?: (e: InkwellEvent) => void;
}

export function Modal(props: ModalProps) {
  const theme = getDefaultTheme(props.theme);
  const tokens = getDefaultTokens();
  if (!props.open) {
    return <Container key={props.key} width={0} height={0} pointerEvent="none" />;
  }

  const dialogW = props.width ?? 520;
  const maskColor = 'rgba(0, 0, 0, 0.45)';

  return (
    <SizedBox key={props.key} width={props.viewportWidth} height={props.viewportHeight}>
      <Stack allowOverflowPositioned={true}>
        <Container
          key="modal-mask"
          width={props.viewportWidth}
          height={props.viewportHeight}
          color={maskColor}
          pointerEvent="auto"
          onPointerDown={(e: InkwellEvent) => {
            e.stopPropagation?.();
            if (props.maskClosable !== false) {
              props.onCancel?.(e);
            }
          }}
        />
        <Container
          key="modal-center"
          width={props.viewportWidth}
          height={props.viewportHeight}
          alignment="center"
          pointerEvent="none"
        >
          <Container
            key="modal-dialog"
            width={dialogW}
            borderRadius={tokens.borderRadius}
            border={{ width: tokens.borderWidth, color: theme.border.base }}
            color={theme.background.container}
            padding={16}
            pointerEvent="auto"
          >
            <Column spacing={12} crossAxisAlignment={CrossAxisAlignment.Start}>
              {props.title ? (
                <Text
                  key="modal-title"
                  text={props.title}
                  fontSize={16}
                  color={theme.text.primary}
                  lineHeight={24}
                  fontWeight="bold"
                  pointerEvent="none"
                />
              ) : null}
              <Container key="modal-body" pointerEvent="auto">
                {props.children}
              </Container>
              <Row
                key="modal-footer"
                spacing={8}
                mainAxisAlignment={MainAxisAlignment.End}
                crossAxisAlignment={CrossAxisAlignment.Center}
              >
                <Button theme={theme} btnType="default" onClick={(e) => props.onCancel?.(e)}>
                  <Text
                    text={props.cancelText ?? '取消'}
                    fontSize={14}
                    color={theme.text.primary}
                    textAlignVertical={TextAlignVertical.Center}
                    pointerEvent="none"
                  />
                </Button>
                <Button theme={theme} btnType="primary" onClick={(e) => props.onOk?.(e)}>
                  <Text
                    text={props.okText ?? '确定'}
                    fontSize={14}
                    color={theme.text.inverse}
                    textAlignVertical={TextAlignVertical.Center}
                    pointerEvent="none"
                  />
                </Button>
              </Row>
            </Column>
          </Container>
        </Container>
      </Stack>
    </SizedBox>
  );
}
