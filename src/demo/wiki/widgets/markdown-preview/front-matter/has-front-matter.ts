import type { MarkdownFrontMatter } from '../../../helpers/wiki-doc';

export function hasFrontMatter(frontMatter: MarkdownFrontMatter): boolean {
  return (
    !!frontMatter.title ||
    !!frontMatter.link ||
    !!frontMatter.date ||
    (frontMatter.categories?.length ?? 0) > 0
  );
}
