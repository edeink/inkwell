/** @jsxImportSource @/utils/compiler */
import type { ThemePalette } from '@/styles/theme';

import { Container, Row, StatelessWidget, Text, type WidgetProps } from '@/core';

export type FrontMatterCategoriesProps = {
  categories?: string[];
  theme: ThemePalette;
} & WidgetProps;

export class FrontMatterCategories extends StatelessWidget<FrontMatterCategoriesProps> {
  protected render() {
    const { categories, theme } = this.props;
    if ((categories?.length ?? 0) === 0) {
      return null;
    }
    return (
      <Row spacing={6}>
        {categories!.map((category) => (
          <FrontMatterCategoryPill key={category} category={category} theme={theme} />
        ))}
      </Row>
    );
  }
}

export class FrontMatterCategoryPill extends StatelessWidget<
  { category: string; theme: ThemePalette } & WidgetProps
> {
  protected render() {
    const { category, theme } = this.props;
    return (
      <Container
        color={theme.state.hover}
        borderRadius={999}
        padding={{ left: 8, right: 8, top: 2, bottom: 2 }}
      >
        <Text text={category} fontSize={12} lineHeight={16} color={theme.text.secondary} />
      </Container>
    );
  }
}
