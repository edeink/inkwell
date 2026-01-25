/** @jsxImportSource @/utils/compiler */
import { getDefaultTheme, getDefaultTokens } from '../theme';

import type { ThemePalette } from '@/styles/theme';

import {
  Column,
  Container,
  CrossAxisAlignment,
  MainAxisAlignment,
  MainAxisSize,
  Row,
  Text,
  TextAlignVertical,
  type WidgetProps,
} from '@/core';

export interface FormItemProps extends WidgetProps {
  theme?: ThemePalette;
  label?: string;
  required?: boolean;
  help?: string;
  validateStatus?: 'success' | 'warning' | 'error' | 'validating';
  labelWidth?: number;
  colon?: boolean;
  layout?: 'horizontal' | 'vertical';
  gap?: number;
}

export function FormItem(props: FormItemProps) {
  const theme = getDefaultTheme(props.theme);
  const tokens = getDefaultTokens();
  const layout = props.layout ?? 'horizontal';
  const labelWidth = props.labelWidth ?? 96;
  const colon = props.colon ?? true;
  const gap = props.gap ?? 8;

  const showHelp = typeof props.help === 'string' && props.help.length > 0;
  const isError = props.validateStatus === 'error';
  const isWarning = props.validateStatus === 'warning';
  const helpColor = isError ? theme.danger : isWarning ? theme.warning : theme.text.secondary;

  const labelText = props.label ? `${props.label}${colon ? '：' : ''}` : '';

  const control = (
    <Column
      spacing={4}
      crossAxisAlignment={CrossAxisAlignment.Start}
      mainAxisSize={MainAxisSize.Min}
    >
      <Container pointerEvent="auto">{props.children}</Container>
      {showHelp ? (
        <Text
          text={props.help as string}
          fontSize={12}
          color={helpColor}
          lineHeight={16}
          pointerEvent="none"
        />
      ) : null}
    </Column>
  );

  if (layout === 'vertical') {
    return (
      <Column key={props.key} spacing={gap} crossAxisAlignment={CrossAxisAlignment.Start}>
        {props.label ? (
          <Row spacing={6} crossAxisAlignment={CrossAxisAlignment.Center}>
            {props.required ? (
              <Text text="*" fontSize={14} color={theme.danger} pointerEvent="none" />
            ) : null}
            <Text
              text={labelText}
              fontSize={tokens.fontSize}
              color={theme.text.primary}
              textAlignVertical={TextAlignVertical.Center}
              pointerEvent="none"
            />
          </Row>
        ) : null}
        {control}
      </Column>
    );
  }

  return (
    <Row key={props.key} spacing={gap} crossAxisAlignment={CrossAxisAlignment.Center}>
      <Container
        width={labelWidth}
        height={tokens.lineHeight}
        alignment="center"
        pointerEvent="none"
      >
        <Row
          spacing={6}
          crossAxisAlignment={CrossAxisAlignment.Center}
          mainAxisAlignment={MainAxisAlignment.End}
        >
          {props.required ? (
            <Text text="*" fontSize={14} color={theme.danger} pointerEvent="none" />
          ) : null}
          <Text
            text={labelText}
            fontSize={tokens.fontSize}
            color={theme.text.primary}
            textAlignVertical={TextAlignVertical.Center}
            pointerEvent="none"
          />
        </Row>
      </Container>
      {control}
    </Row>
  );
}
