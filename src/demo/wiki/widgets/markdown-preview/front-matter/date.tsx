/** @jsxImportSource @/utils/compiler */
import type { ThemePalette } from '@/styles/theme';

import { StatelessWidget, Text, type WidgetProps } from '@/core';

export type FrontMatterDateProps = {
  date?: string;
  theme: ThemePalette;
} & WidgetProps;

export class FrontMatterDate extends StatelessWidget<FrontMatterDateProps> {
  protected render() {
    const { date, theme } = this.props;
    if (!date) {
      return null;
    }
    return <Text text={date} fontSize={12} lineHeight={16} color={theme.text.secondary} />;
  }
}
