/** @jsxImportSource @/utils/compiler */

import { FrontMatterCategories } from './categories.tsx';
import { FrontMatterDate } from './date.tsx';
import { FrontMatterLink } from './link.tsx';
import { FrontMatterTitle } from './title.tsx';

import type { MarkdownFrontMatter } from '../../../helpers/wiki-doc.ts';
import type { ThemePalette } from '@/styles/theme';

import { Column, Container, Padding, Row, StatelessWidget, type WidgetProps } from '@/core';
import { CrossAxisAlignment } from '@/core/flex/type';

export type FrontMatterProps = {
  frontMatter: MarkdownFrontMatter;
  theme: ThemePalette;
} & WidgetProps;

export class FrontMatter extends StatelessWidget<FrontMatterProps> {
  protected render() {
    const { frontMatter, theme } = this.props;
    const showMeta = !!frontMatter.date || (frontMatter.categories?.length ?? 0) > 0;
    return (
      <Container alignment="topLeft">
        <Padding padding={{ bottom: 16 }}>
          <Column crossAxisAlignment={CrossAxisAlignment.Start} spacing={10}>
            <FrontMatterTitle title={frontMatter.title} theme={theme} />
            {showMeta ? (
              <Row spacing={10}>
                <FrontMatterDate date={frontMatter.date} theme={theme} />
                <FrontMatterCategories categories={frontMatter.categories} theme={theme} />
              </Row>
            ) : null}
            <FrontMatterLink link={frontMatter.link} theme={theme} />
          </Column>
        </Padding>
      </Container>
    );
  }
}
