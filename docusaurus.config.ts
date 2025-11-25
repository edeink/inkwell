import type { ThemeConfig } from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';

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
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: 'docs',
          sidebarPath: require.resolve('./sidebars.ts'),
          includeCurrentVersion: true,
          versions: {
            current: {
              label: '当前',
            },
          },
        },
        theme: {
          customCss: require.resolve('./src/docusaurus/css/custom.css'),
        },
      },
    ],
  ],
  plugins: [
    require.resolve('docusaurus-plugin-search-local'),
    function myLessPlugin() {
      return {
        name: 'inkwell-less-modules',
        configureWebpack() {
          return {
            devtool: 'source-map',
            resolve: {
              alias: {
                '@': require('path').resolve(__dirname, './src'),
                '@site/src': require('path').resolve(__dirname, './src/docusaurus'),
              },
            },
            module: {
              rules: [
                {
                  test: /\.module\.less$/,
                  use: [
                    require.resolve('style-loader'),
                    {
                      loader: require.resolve('css-loader'),
                      options: {
                        modules: {
                          localIdentName: 'ink_[local]_[hash:base64:5]',
                        },
                        importLoaders: 1,
                      },
                    },
                    require.resolve('less-loader'),
                  ],
                },
                {
                  test: /(?<!module)\.less$/,
                  use: [
                    require.resolve('style-loader'),
                    require.resolve('css-loader'),
                    require.resolve('less-loader'),
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
      const path = require('path');
      return {
        name: 'inkwell-local-theme',
        getThemePath() {
          return path.resolve(__dirname, './src/docusaurus/theme');
        },
      };
    },
  ],
  themeConfig: {
    image: 'img/social-card.png',
    navbar: {
      title: 'Inkwell',
      hideOnScroll: true,
      items: [
        { type: 'doc', docId: 'intro', position: 'left', label: '指南' },
        { type: 'doc', docId: 'widgets/overview', position: 'left', label: 'Widgets' },
        { href: 'https://github.com/edeink/inkwell', position: 'right', label: 'GitHub', className: 'header-github-link header-icon' },
        { href: 'https://stackblitz.com/github/edeink/inkwell', position: 'right', label: 'Playground', className: 'header-playground-link header-icon' },
        { href: 'https://github.com/edeink/inkwell/discussions', position: 'right', label: '社区', className: 'header-community-link header-icon' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            { label: '指南', to: '/' },
            { label: 'Widgets', to: '/widgets/overview' },
          ],
        },
      ],
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