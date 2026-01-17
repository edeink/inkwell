import path from 'path';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

import type { ThemeConfig } from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';

const isProd = process.env.NODE_ENV === 'production';

class EmitCommonjsPackageJsonPlugin {
  apply(compiler: any) {
    const pluginName = 'EmitCommonjsPackageJsonPlugin';
    const { webpack } = compiler;
    compiler.hooks.thisCompilation.tap(pluginName, (compilation: any) => {
      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        () => {
          compilation.emitAsset(
            'package.json',
            new webpack.sources.RawSource(JSON.stringify({ type: 'commonjs' })),
          );
        },
      );
    });
  }
}

const config: Config = {
  title: 'Inkwell 文档',
  tagline: '基于 Canvas 的高性能 UI 系统，友好的 JSX 体验',
  url: 'https://localhost',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
  },

  markdown: {
    mermaid: true,
  },

  stylesheets: [
    {
      href: 'https://unpkg.com/katex@0.16.9/dist/katex.min.css',
      type: 'text/css',
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: 'docs',
          sidebarPath: path.resolve(__dirname, './sidebars.ts'),
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
          includeCurrentVersion: true,
          // 在生产环境中排除本地调试文档，仅本地构建可见
          include: isProd ? ['**/*.{md,mdx}', '!test/*.mdx'] : ['**/*.{md,mdx}'],
          versions: {
            current: {
              label: '当前',
            },
          },
        },
        theme: {
          customCss: path.resolve(__dirname, './src/docusaurus/css/custom.css'),
        },
      },
    ],
  ],

  plugins: [
    // 'docusaurus-plugin-search-local',
    function myCustomPlugin() {
      return {
        name: 'inkwell-custom-plugin',
        configureWebpack(config, isServer, utils) {
          const { getStyleLoaders } = utils;
          return {
            mergeStrategy: { 'module.rules': 'prepend' },
            devtool: 'source-map',
            resolve: {
              alias: {
                '@': path.resolve(__dirname, './src'),
                '@site/src': path.resolve(__dirname, './src/docusaurus'),
                '@demo': path.resolve(__dirname, './src/demo'),
                '@mindmap': path.resolve(__dirname, './src/demo/mindmap'),
                '@spreadsheet': path.resolve(__dirname, './src/demo/spreadsheet'),
              },
            },
            plugins: isServer ? [new EmitCommonjsPackageJsonPlugin()] : [],
            module: {
              rules: [
                {
                  test: /\.(md|markdown)$/,
                  include: [path.resolve(__dirname, './src/demo/wiki/raw')],
                  resourceQuery: /raw/,
                  type: 'asset/source',
                },
                {
                  test: /\.js$/,
                  include: [path.resolve(__dirname, '.docusaurus')],
                  type: 'javascript/auto',
                },
                {
                  test: /\.module\.less$/,
                  use: [
                    ...getStyleLoaders(isServer, {
                      modules: {
                        localIdentName: 'ink_[local]_[hash:base64:5]',
                        exportOnlyLocals: isServer,
                      },
                      importLoaders: 2,
                      sourceMap: !isProd,
                    }),
                    {
                      loader: 'less-loader',
                      options: { sourceMap: !isProd },
                    },
                  ],
                },
                {
                  test: /(?<!module)\.less$/,
                  use: [
                    ...getStyleLoaders(isServer, {
                      importLoaders: 2,
                      sourceMap: !isProd,
                    }),
                    {
                      loader: 'less-loader',
                      options: { sourceMap: !isProd },
                    },
                  ],
                },
              ],
            },
          };
        },
      };
    },
    [
      '@docusaurus/plugin-content-pages',
      {
        id: 'custom-pages',
        path: './src/docusaurus/pages',
      },
    ],
    function localThemePlugin() {
      return {
        name: 'inkwell-local-theme',
        getThemePath() {
          return path.resolve(__dirname, './src/docusaurus/theme');
        },
      };
    },
  ],

  themes: ['@docusaurus/theme-mermaid'],

  themeConfig: {
    image: 'img/social-card.png',
    navbar: {
      title: 'Inkwell',
      hideOnScroll: true,
      items: [
        { type: 'doc', docId: 'basic/intro', position: 'left', label: '指引' },
        // { type: 'doc', docId: 'widgets/overview', position: 'left', label: 'Widgets' },
        {
          href: 'https://github.com/edeink/inkwell',
          position: 'right',
          label: 'GitHub',
          className: 'header-github-link header-icon',
        },
        {
          to: '/demo',
          position: 'right',
          label: 'Playground',
          className: 'header-playground-link header-icon',
        },
        {
          href: 'https://github.com/edeink/inkwell/issues',
          position: 'right',
          label: '社区',
          className: 'header-community-link header-icon',
        },
      ],
    },
    footer: {
      style: 'dark',
      // links: [
      //   {
      //     title: '文档',
      //     items: [
      //       { label: '指南', to: '/' },
      //       { label: 'Widgets', to: '/docs/widgets/overview' },
      //     ],
      //   },
      // ],
      copyright: `Copyright © ${new Date().getFullYear()} Inkwell`,
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    prism: {},
    docs: {
      sidebar: {
        autoCollapseCategories: true,
        hideable: true,
      },
    },
    liveCodeBlock: {
      playgroundPosition: 'top',
    },
  } satisfies ThemeConfig,
};

export default config;
