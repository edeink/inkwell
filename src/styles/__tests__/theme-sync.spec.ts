import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

import { Themes } from '../theme';

// Helper to extract CSS variables from css content
function parseCssVariables(css: string, selector: string) {
  const vars: Record<string, string> = {};
  // Simple regex to find the block for the selector
  // This is a naive parser but sufficient for this specific file structure
  const blockRegex = new RegExp(
    `${selector.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}\\s*\\{([^}]*)\\}`,
    's',
  );
  const match = css.match(blockRegex);

  if (match) {
    const block = match[1];
    const lineRegex = /--([\w-]+):\s*([^;]+);/g;
    let lineMatch;
    while ((lineMatch = lineRegex.exec(block)) !== null) {
      vars[lineMatch[1]] = lineMatch[2].trim();
    }
  }
  return vars;
}

// Helper to normalize hex colors (e.g. #fff -> #ffffff)
function normalizeHex(hex: string) {
  if (hex.startsWith('#') && hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex.toLowerCase();
}

describe('Theme Color Synchronization', () => {
  const cssPath = path.resolve(__dirname, '../colors.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('should synchronize Light Theme colors', () => {
    const cssVars = parseCssVariables(cssContent, ':root');
    const theme = Themes.light;

    // Check specific mappings
    expect(normalizeHex(cssVars['ink-demo-bg-base'])).toBe(normalizeHex(theme.background.base));
    expect(normalizeHex(cssVars['ink-demo-bg-surface'])).toBe(
      normalizeHex(theme.background.surface),
    );
    expect(normalizeHex(cssVars['ink-demo-bg-container'])).toBe(
      normalizeHex(theme.background.container),
    );

    expect(normalizeHex(cssVars['ink-demo-text-primary'])).toBe(normalizeHex(theme.text.primary));
    expect(normalizeHex(cssVars['ink-demo-text-secondary'])).toBe(
      normalizeHex(theme.text.secondary),
    );
    expect(normalizeHex(cssVars['ink-demo-text-placeholder'])).toBe(
      normalizeHex(theme.text.placeholder),
    );

    expect(normalizeHex(cssVars['ink-demo-border'])).toBe(normalizeHex(theme.border.base));
    expect(normalizeHex(cssVars['ink-demo-border-secondary'])).toBe(
      normalizeHex(theme.border.secondary),
    );

    expect(normalizeHex(cssVars['ink-demo-grid-line'])).toBe(
      normalizeHex(theme.component.gridLine),
    );
    expect(normalizeHex(cssVars['ink-demo-header-bg'])).toBe(
      normalizeHex(theme.component.headerBg),
    );
    expect(normalizeHex(cssVars['ink-demo-header-bg-active'])).toBe(
      normalizeHex(theme.component.headerBgActive),
    );
  });

  it('should synchronize Dark Theme colors', () => {
    const cssVars = parseCssVariables(cssContent, "html[data-theme='dark']");
    const theme = Themes.dark;

    // Check specific mappings
    expect(normalizeHex(cssVars['ink-demo-bg-base'])).toBe(normalizeHex(theme.background.base));
    expect(normalizeHex(cssVars['ink-demo-bg-surface'])).toBe(
      normalizeHex(theme.background.surface),
    );
    expect(normalizeHex(cssVars['ink-demo-bg-container'])).toBe(
      normalizeHex(theme.background.container),
    );

    expect(normalizeHex(cssVars['ink-demo-text-primary'])).toBe(normalizeHex(theme.text.primary));
    expect(normalizeHex(cssVars['ink-demo-text-secondary'])).toBe(
      normalizeHex(theme.text.secondary),
    );
    expect(normalizeHex(cssVars['ink-demo-text-placeholder'])).toBe(
      normalizeHex(theme.text.placeholder),
    );

    expect(normalizeHex(cssVars['ink-demo-border'])).toBe(normalizeHex(theme.border.base));
    expect(normalizeHex(cssVars['ink-demo-border-secondary'])).toBe(
      normalizeHex(theme.border.secondary),
    );

    expect(normalizeHex(cssVars['ink-demo-grid-line'])).toBe(
      normalizeHex(theme.component.gridLine),
    );
    expect(normalizeHex(cssVars['ink-demo-header-bg'])).toBe(
      normalizeHex(theme.component.headerBg),
    );
    expect(normalizeHex(cssVars['ink-demo-header-bg-active'])).toBe(
      normalizeHex(theme.component.headerBgActive),
    );
  });
});
