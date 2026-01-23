/** @jsxImportSource @/utils/compiler */

/**
 * TextAreaPanel：多行输入示例（TextArea + 外观容器 + 字符数）。
 *
 * 说明：TextArea 的核心交互能力在 core 内实现，这里只做 demo 组合。
 */
import type { WidgetProps } from '@/core/base';
import type { ThemePalette } from '@/styles/theme';

import { Column, Container, CrossAxisAlignment, Padding, Text, TextArea } from '@/core';
import { StatelessWidget } from '@/core/state/stateless';

export interface TextAreaPanelProps extends WidgetProps {
  theme: ThemePalette;
  value: string;
  onChange: (value: string) => void;
}

export class TextAreaPanel extends StatelessWidget<TextAreaPanelProps> {
  protected render() {
    const { theme, value, onChange } = this.props;
    const borderColor = theme.border.base;

    return (
      <Column spacing={10} crossAxisAlignment={CrossAxisAlignment.Start}>
        <Text text="多行编辑器 (TextArea)" fontSize={16} color={theme.text.secondary} />
        <Container
          width={300}
          height={150}
          border={{ color: borderColor, width: 1 }}
          borderRadius={4}
          color={theme.background.container}
        >
          <Padding padding={12}>
            <TextArea
              value={value}
              onChange={onChange}
              color={theme.text.primary}
              fontSize={14}
              lineHeight={24}
              selectionColor={theme.state.focus}
              cursorColor={theme.text.primary}
            />
          </Padding>
        </Container>
        <Container width={300}>
          <Text text={`字符数: ${value.length}`} fontSize={12} color={theme.text.placeholder} />
        </Container>
      </Column>
    );
  }
}
