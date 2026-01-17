/** @jsxImportSource @/utils/compiler */
import type { ThemePalette } from '@/styles/theme';

import { StatelessWidget, Text, type WidgetProps } from '@/core';

export type FrontMatterLinkProps = {
  link?: string;
  theme: ThemePalette;
} & WidgetProps;

export class FrontMatterLink extends StatelessWidget<FrontMatterLinkProps> {
  protected render() {
    const { link, theme } = this.props;
    if (!link) {
      return null;
    }
    return (
      <Text text={`link: ${link}`} fontSize={12} lineHeight={16} color={theme.text.placeholder} />
    );
  }
}
