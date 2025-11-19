import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/search',
    component: ComponentCreator('/search', '044'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', 'ee6'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'ecd'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '6ad'),
            routes: [
              {
                path: '/docs/',
                component: ComponentCreator('/docs/', 'be8'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/widgets/Center',
                component: ComponentCreator('/docs/widgets/Center', '403'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/widgets/Column',
                component: ComponentCreator('/docs/widgets/Column', '097'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/widgets/Container',
                component: ComponentCreator('/docs/widgets/Container', 'd58'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/widgets/Expanded',
                component: ComponentCreator('/docs/widgets/Expanded', 'f9c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/widgets/Image',
                component: ComponentCreator('/docs/widgets/Image', 'b69'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/widgets/overview',
                component: ComponentCreator('/docs/widgets/overview', 'e93'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/widgets/Padding',
                component: ComponentCreator('/docs/widgets/Padding', '445'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/widgets/Positioned',
                component: ComponentCreator('/docs/widgets/Positioned', '024'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/widgets/Row',
                component: ComponentCreator('/docs/widgets/Row', '3bd'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/widgets/SizedBox',
                component: ComponentCreator('/docs/widgets/SizedBox', 'f6b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/widgets/Stack',
                component: ComponentCreator('/docs/widgets/Stack', '078'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/docs/widgets/Text',
                component: ComponentCreator('/docs/widgets/Text', '442'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
