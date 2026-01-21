/** @jsxImportSource @/utils/compiler */
import {
  defaultMarkdownRenderStyle,
  MarkdownPreview,
  NodeType,
  type MarkdownRenderStyle,
} from '../wiki/widgets/markdown-preview';

import avatarUrl from './assets/avator.jpeg?url';
import resumeMarkdown from './raw/resume.markdown?raw';

import type { BlockRenderer } from '../wiki/widgets/markdown-preview/block-renderers';
import type { InlineRenderer } from '../wiki/widgets/markdown-preview/inline-renderers/types';
import type Runtime from '@/runtime';
import type { ThemePalette } from '@/styles/theme';

import {
  ClipRect,
  Column,
  Container,
  Expanded,
  Image,
  ImageFit,
  Padding,
  Row,
  ScrollView,
  StatelessWidget,
  Text,
  Wrap,
} from '@/core';
import { CrossAxisAlignment } from '@/core/flex/type';
import { Overflow } from '@/core/text';
import { Themes } from '@/styles/theme';

export const RESUME_PAGE_WIDTH = 780;

export const RESUME_SPACE_VARS = {
  xs: '--space-xs',
  sm: '--space-sm',
  md: '--space-md',
  lg: '--space-lg',
  xl: '--space-xl',
  xxl: '--space-xxl',
} as const;

export const RESUME_SPACE_BASE_PX = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
} as const;

type SpaceTokens = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
};

function createSpaceTokens(scale: number): SpaceTokens {
  return {
    xs: Math.round(RESUME_SPACE_BASE_PX.xs * scale),
    sm: Math.round(RESUME_SPACE_BASE_PX.sm * scale),
    md: Math.round(RESUME_SPACE_BASE_PX.md * scale),
    lg: Math.round(RESUME_SPACE_BASE_PX.lg * scale),
    xl: Math.round(RESUME_SPACE_BASE_PX.xl * scale),
    xxl: Math.round(RESUME_SPACE_BASE_PX.xxl * scale),
  };
}

const RESUME_SPACE_DESKTOP = createSpaceTokens(1);
const RESUME_SPACE_MOBILE = createSpaceTokens(0.8);

function createResumeMarkdownStyle(space: SpaceTokens): MarkdownRenderStyle {
  return {
    ...defaultMarkdownRenderStyle,
    inlineWrap: { ...defaultMarkdownRenderStyle.inlineWrap, runSpacing: space.xs },
    text: { fontSize: 14, lineHeight: 22 },
    header: {
      ...defaultMarkdownRenderStyle.header,
      // 标题区块：上下各 16px（合计 32px），建立最大层级间距。
      paddingTop: space.sm,
      paddingBottom: space.sm,
      fontSize: [22, 16, 14, 13, 12, 12],
      lineHeight: [30, 22, 20, 20, 18, 18],
      accentBar: {
        levels: [1, 2],
        width: 4,
        height: 20,
        gap: space.sm,
        radius: 2,
      },
    },
    // 段落间距：统一 24px，保证阅读呼吸感与一致性。
    paragraph: { marginBottom: space.md },
    list: {
      ...defaultMarkdownRenderStyle.list,
      // 列表块与下一个块之间：统一 24px。
      marginBottom: space.md,
      columnSpacing: space.xs,
      // 列表项垂直节奏：统一 16px，避免过于拥挤。
      rowSpacing: space.sm,
      markerPaddingTop: space.xs,
      markerSize: 4,
      markerRadius: 2,
    },
    orderedList: {
      ...defaultMarkdownRenderStyle.orderedList,
      marginBottom: space.md,
      columnSpacing: space.xs,
      rowSpacing: space.sm,
      numberWidth: 20,
      numberPaddingTop: 0,
      numberFontSize: 13,
      numberLineHeight: 20,
    },
    taskList: {
      ...defaultMarkdownRenderStyle.taskList,
      marginBottom: space.md,
      columnSpacing: space.xs,
      rowSpacing: space.sm,
      checkboxPaddingTop: 3,
      checkboxSize: 12,
    },
    quote: {
      ...defaultMarkdownRenderStyle.quote,
      marginBottom: space.md,
      // 引用块内部：使用 16px 作为元素级间距。
      paddingTop: space.sm,
      paddingBottom: space.sm,
    },
    codeBlock: {
      ...defaultMarkdownRenderStyle.codeBlock,
      marginBottom: space.md,
      // 代码块内部：16px 更贴近元素级密度，避免“卡片级”过大内边距。
      padding: space.sm,
      fontSize: 13,
      lineHeight: 18,
    },
    inlineCode: {
      ...defaultMarkdownRenderStyle.inlineCode,
      fontSize: 13,
      lineHeight: 18,
    },
    table: {
      ...defaultMarkdownRenderStyle.table,
      marginBottom: space.md,
      cellPaddingTop: space.xs,
      cellPaddingBottom: space.xs,
      textFontSize: 13,
      textLineHeight: 20,
    },
  };
}

const RESUME_MARKDOWN_STYLE_DESKTOP = createResumeMarkdownStyle(RESUME_SPACE_DESKTOP);
const RESUME_MARKDOWN_STYLE_MOBILE = createResumeMarkdownStyle(RESUME_SPACE_MOBILE);

const resumeInlineRenderers: InlineRenderer[] = [
  {
    match: (ctx) => ctx.node.type === NodeType.Italic,
    render: (ctx) => (
      <Text
        key={String(ctx.widgetKey ?? '')}
        text={ctx.node.content || ''}
        fontSize={ctx.style.text.fontSize}
        lineHeight={ctx.style.text.lineHeight}
        color={ctx.theme.text.secondary}
      />
    ),
  },
];

function parseResumeProfileBlock(raw: string): {
  name?: string;
  title?: string;
  tag?: string;
  avatar?: string;
  links: Array<{ label: string; href?: string }>;
  contacts: string[];
} {
  const out: {
    name?: string;
    title?: string;
    tag?: string;
    avatar?: string;
    links: Array<{ label: string; href?: string }>;
    contacts: string[];
  } = { links: [], contacts: [] };

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const keyRe = /(name|title|tag|avatar|links|contacts)\s*:/g;

  for (const line of lines) {
    const matches = Array.from(line.matchAll(keyRe));
    if (matches.length === 0) {
      continue;
    }
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const key = String(m[1]);
      const start = (m.index ?? 0) + m[0].length;
      const end = i + 1 < matches.length ? (matches[i + 1].index ?? line.length) : line.length;
      const value = line.slice(start, end).trim();
      if (!value) {
        continue;
      }

      if (key === 'name') {
        out.name = value;
        continue;
      }
      if (key === 'title') {
        out.title = value;
        continue;
      }
      if (key === 'tag') {
        out.tag = value;
        continue;
      }
      if (key === 'avatar') {
        out.avatar = value;
        continue;
      }
      if (key === 'links') {
        const items = value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        for (const item of items) {
          const [labelRaw, hrefRaw] = item.split('|').map((s) => s.trim());
          const label = labelRaw || hrefRaw;
          if (!label) {
            continue;
          }
          out.links.push({ label, href: hrefRaw || undefined });
        }
        continue;
      }
      if (key === 'contacts') {
        const items = value
          .split(/[,，]/)
          .flatMap((s) => s.split('·'))
          .map((s) => s.trim())
          .filter(Boolean);
        out.contacts.push(...items);
        continue;
      }
    }
  }

  return out;
}

function createResumeBlockRenderers(space: SpaceTokens): BlockRenderer[] {
  return [
    {
      match: (ctx) =>
        ctx.node.type === NodeType.CodeBlock && ctx.node.language === 'resume-profile',
      render: (ctx) => {
        const key = String(ctx.widgetKey ?? '');
        const data = parseResumeProfileBlock(ctx.node.content || '');
        const resolvedAvatar =
          data.avatar === 'src/demo/resume/assets/avator.jpeg' ||
          data.avatar === '/src/demo/resume/assets/avator.jpeg'
            ? avatarUrl
            : data.avatar?.startsWith('src/')
              ? `/${data.avatar}`
              : data.avatar;

        const nameFontSize = 22;
        const nameLineHeight = 30;
        const metaFontSize = 14;
        const metaLineHeight = 22;
        const avatarSize = 92;
        const avatarRadius = avatarSize / 2;
        const metaItems: Array<
          | { kind: 'contact'; value: string }
          | { kind: 'link'; value: { label: string; href?: string } }
        > = [
          ...data.contacts.map((c) => ({ kind: 'contact' as const, value: c })),
          ...data.links.map((l) => ({ kind: 'link' as const, value: l })),
        ];

        return (
          // 个人信息区块：作为简历“标题区”内容承载，用 32px（移动端 80%）与后续内容拉开层级。
          <Padding key={key} padding={{ bottom: space.lg }}>
            <Row crossAxisAlignment={CrossAxisAlignment.Start} spacing={space.sm}>
              <Expanded flex={{ flex: 1 }}>
                <Column crossAxisAlignment={CrossAxisAlignment.Start} spacing={space.xs}>
                  {data.name || data.title ? (
                    <Row crossAxisAlignment={CrossAxisAlignment.Center} spacing={space.xs}>
                      {data.name ? (
                        <Text
                          key="name"
                          text={data.name}
                          fontSize={nameFontSize}
                          lineHeight={nameLineHeight}
                          fontWeight="bold"
                          color={ctx.theme.text.primary}
                        />
                      ) : null}
                      {data.name && data.title ? (
                        <Text
                          key="dot"
                          text="·"
                          fontSize={nameFontSize}
                          lineHeight={nameLineHeight}
                          color={ctx.theme.text.primary}
                        />
                      ) : null}
                      {data.title ? (
                        <Expanded flex={{ flex: 1 }}>
                          <Text
                            key="title"
                            text={data.title}
                            fontSize={16}
                            lineHeight={nameLineHeight}
                            fontWeight="bold"
                            color={ctx.theme.text.primary}
                            maxLines={1}
                            overflow={Overflow.Ellipsis}
                          />
                        </Expanded>
                      ) : null}
                    </Row>
                  ) : null}

                  {data.tag ? (
                    <Text
                      key="tag"
                      text={data.tag}
                      fontSize={metaFontSize}
                      lineHeight={metaLineHeight}
                      color={ctx.theme.text.secondary}
                      fontStyle="italic"
                      maxLines={1}
                      overflow={Overflow.Ellipsis}
                    />
                  ) : null}

                  {metaItems.length > 0 ? (
                    <Wrap spacing={space.xs} runSpacing={space.sm}>
                      {metaItems.map((item, i) =>
                        item.kind === 'contact' ? (
                          <Text
                            key={`contact-${i}`}
                            text={item.value}
                            fontSize={metaFontSize}
                            lineHeight={metaLineHeight}
                            color={ctx.theme.text.secondary}
                          />
                        ) : (
                          <Text
                            key={`link-${i}`}
                            text={item.value.label}
                            fontSize={metaFontSize}
                            lineHeight={metaLineHeight}
                            color={ctx.theme.primary}
                            textDecoration="underline"
                            cursor={item.value.href ? 'pointer' : undefined}
                            pointerEvent={item.value.href ? 'auto' : 'none'}
                            onClick={() => {
                              if (item.value.href) {
                                window.open(item.value.href, '_blank');
                              }
                            }}
                          />
                        ),
                      )}
                    </Wrap>
                  ) : null}
                </Column>
              </Expanded>

              <Container
                width={avatarSize}
                height={avatarSize}
                borderRadius={avatarRadius}
                color={ctx.theme.background.base}
                border={{ width: 1, color: ctx.theme.border.base }}
              >
                {resolvedAvatar ? (
                  <ClipRect borderRadius={avatarRadius}>
                    <Image
                      key="avatar"
                      type="image"
                      src={resolvedAvatar}
                      width={avatarSize}
                      height={avatarSize}
                      fit={ImageFit.Cover}
                    />
                  </ClipRect>
                ) : null}
              </Container>
            </Row>
          </Padding>
        );
      },
    },
  ];
}

const RESUME_BLOCK_RENDERERS_DESKTOP = createResumeBlockRenderers(RESUME_SPACE_DESKTOP);
const RESUME_BLOCK_RENDERERS_MOBILE = createResumeBlockRenderers(RESUME_SPACE_MOBILE);

export type ResumeDemoAppProps = {
  width: number;
  height: number;
  theme: ThemePalette;
  mode?: 'view' | 'export';
};

export class ResumeDemoApp extends StatelessWidget<ResumeDemoAppProps> {
  render() {
    const { width, height, theme, mode = 'view' } = this.props;
    const isMobile = mode === 'view' && width < 480;
    const space = isMobile ? RESUME_SPACE_MOBILE : RESUME_SPACE_DESKTOP;
    const pageWidth =
      mode === 'export'
        ? RESUME_PAGE_WIDTH
        : Math.min(RESUME_PAGE_WIDTH, Math.max(320, Math.floor(width) - space.lg * 2));
    const markdownStyle = isMobile ? RESUME_MARKDOWN_STYLE_MOBILE : RESUME_MARKDOWN_STYLE_DESKTOP;
    const blockRenderers = isMobile
      ? RESUME_BLOCK_RENDERERS_MOBILE
      : RESUME_BLOCK_RENDERERS_DESKTOP;

    if (mode === 'export') {
      return (
        <Container
          color={theme?.background?.base ?? Themes.light.background.base}
          // 导出容器：用卡片外间距 32px 包住页面，确保截图边缘留白一致。
          padding={[space.lg, space.lg]}
        >
          <Container
            key="resume-page"
            width={pageWidth}
            color={theme?.background?.surface ?? Themes.light.background.surface}
            borderRadius={12}
            // 卡片内边距：与预览模式一致。
            padding={[space.xxl]}
          >
            <MarkdownPreview
              key="resume-md"
              content={String(resumeMarkdown)}
              theme={theme || Themes.light}
              style={markdownStyle}
              inlineRenderers={resumeInlineRenderers}
              blockRenderers={blockRenderers}
            />
          </Container>
        </Container>
      );
    }

    return (
      <ScrollView width={width} height={height} key="resume-root-scroll">
        <Container
          minWidth={width}
          alignment="center"
          color={theme?.background?.base ?? Themes.light.background.base}
        >
          <Container
            key="resume-page"
            width={pageWidth}
            color={theme?.background?.surface ?? Themes.light.background.surface}
            borderRadius={12}
            padding={[space.xxl]}
            margin={[space.lg, 0]}
          >
            <MarkdownPreview
              key="resume-md"
              content={String(resumeMarkdown)}
              theme={theme || Themes.light}
              style={markdownStyle}
              inlineRenderers={resumeInlineRenderers}
              blockRenderers={blockRenderers}
            />
          </Container>
        </Container>
      </ScrollView>
    );
  }
}

export function runApp(runtime: Runtime, width: number, height: number, theme: ThemePalette) {
  return runtime.render(
    <ResumeDemoApp width={width} height={height} theme={theme || Themes.light} mode="view" />,
  );
}

export function runExportApp(runtime: Runtime, width: number, height: number, theme: ThemePalette) {
  return runtime.render(
    <ResumeDemoApp width={width} height={height} theme={theme || Themes.light} mode="export" />,
  );
}
