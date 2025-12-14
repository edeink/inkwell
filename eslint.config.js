import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';
import { globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config([
  globalIgnores(['dist', 'docusaurus.config.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
      eslintConfigPrettier,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
      prettier: prettierPlugin,
    },
    // 一般规则：对所有 TS/TSX 文件启用严格的 any 禁用（除专用覆盖外）
    rules: {
      'unused-imports/no-unused-imports': 'off',
      'unused-imports/no-unused-vars': 'off',
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      'custom-property-pattern': 'off',
      'react-refresh/only-export-components': 'off',
      'no-empty': 'off',
      curly: ['warn', 'all'],
      'max-len': [
        'warn',
        { code: 100, ignoreUrls: false, ignoreStrings: false, ignoreTemplateLiterals: false },
      ],
      'object-curly-newline': 'off',
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    // 测试覆盖：*.spec.tsx 文件中关闭 no-explicit-any
    // 原因：测试场景常需要快速构造、模拟与断言对象，使用 any 可提升可读性与编写效率
    // 适用范围：仅匹配所有路径下的 *.spec.tsx 文件，不影响生产代码
    files: ['**/*.spec.tsx', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]);
