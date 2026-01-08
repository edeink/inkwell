export default {
  presets: [
    [
      '@docusaurus/core/lib/babel/preset',
      {
        react: {
          runtime: 'classic',
        },
      },
    ],
  ],
  overrides: [
    {
      test: /\.(ts|tsx)$/,
      exclude: /node_modules/,
      plugins: [
        ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
        ['@babel/plugin-proposal-decorators', { version: '2023-05' }],
      ],
    },
  ],
};
