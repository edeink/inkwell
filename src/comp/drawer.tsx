/** @jsxImportSource @/utils/compiler */
import { Button } from './button';
import { getDefaultTheme, getDefaultTokens } from './theme';

import type { ThemePalette } from '@/styles/theme';

import {
  Column,
  Container,
  CrossAxisAlignment,
  MainAxisAlignment,
  Positioned,
  Row,
  SizedBox,
  Stack,
  Text,
  TextAlignVertical,
  type InkwellEvent,
  type WidgetProps,
} from '@/core';

export interface DrawerProps extends WidgetProps {
  theme?: ThemePalette;
  open: boolean;
  viewportWidth: number;
  viewportHeight: number;
  width?: number;
  title?: string;
  maskClosable?: boolean;
  onClose?: (e: InkwellEvent) => void;
}

export function Drawer(props: DrawerProps) {
  const theme = getDefaultTheme(props.theme);
  const tokens = getDefaultTokens();
  if (!props.open) {
    return <Container key={props.key} width={0} height={0} pointerEvent="none" />;
  }

  const maskColor = 'rgba(0, 0, 0, 0.45)';
  const drawerW = props.width ?? 378;

  return (
    <SizedBox key={props.key} width={props.viewportWidth} height={props.viewportHeight}>
      <Stack allowOverflowPositioned={true}>
        <Container
          key="drawer-mask"
          width={props.viewportWidth}
          height={props.viewportHeight}
          color={maskColor}
          pointerEvent="auto"
          onPointerDown={(e: InkwellEvent) => {
            e.stopPropagation?.();
            if (props.maskClosable !== false) {
              props.onClose?.(e);
            }
          }}
        />
        <Positioned
          key="drawer-panel"
          right={0}
          top={0}
          width={drawerW}
          height={props.viewportHeight}
        >
          <Container
            width={drawerW}
            height={props.viewportHeight}
            color={theme.background.container}
            border={{ width: tokens.borderWidth, color: theme.border.base }}
            pointerEvent="auto"
          >
            <Column spacing={0} crossAxisAlignment={CrossAxisAlignment.Start}>
              <Container
                key="drawer-header"
                height={56}
                padding={{ left: 16, right: 16 }}
                border={{ width: tokens.borderWidth, color: theme.border.secondary }}
                color={theme.background.container}
                alignment="center"
              >
                <Row
                  mainAxisAlignment={MainAxisAlignment.SpaceBetween}
                  crossAxisAlignment={CrossAxisAlignment.Center}
                >
                  <Text
                    key="drawer-title"
                    text={props.title ?? '抽屉'}
                    fontSize={16}
                    fontWeight="bold"
                    color={theme.text.primary}
                    textAlignVertical={TextAlignVertical.Center}
                    pointerEvent="none"
                  />
                  <Button theme={theme} btnType="text" onClick={(e) => props.onClose?.(e)}>
                    <Text
                      text="关闭"
                      fontSize={14}
                      color={theme.text.secondary}
                      textAlignVertical={TextAlignVertical.Center}
                      pointerEvent="none"
                    />
                  </Button>
                </Row>
              </Container>
              <Container key="drawer-body" padding={16} pointerEvent="auto">
                {props.children}
              </Container>
            </Column>
          </Container>
        </Positioned>
      </Stack>
    </SizedBox>
  );
}
