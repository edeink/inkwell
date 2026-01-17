/** @jsxImportSource @/utils/compiler */
import type { ThemePalette } from '@/styles/theme';

import { StatelessWidget, Text, type WidgetProps } from '@/core';

export type FrontMatterTitleProps = {
  title?: string;
  theme: ThemePalette;
} & WidgetProps;

export class FrontMatterTitle extends StatelessWidget<FrontMatterTitleProps> {
  protected render() {
    const { title, theme } = this.props;
    if (!title) {
      return null;
    }
    return (
      <Text
        text={title}
        fontSize={28}
        lineHeight={36}
        fontWeight="bold"
        color={theme.text.primary}
      />
    );
  }
}
