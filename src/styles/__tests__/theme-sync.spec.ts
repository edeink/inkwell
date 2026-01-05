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

describe('Theme Color Synchronization', () => {
  const cssPath = path.resolve(__dirname, '../colors.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('should synchronize Light Theme colors', () => {
    const cssVars = parseCssVariables(cssContent, ':root');
    const theme = Themes.light;

    // Check specific mappings
    expect(cssVars['ink-demo-bg-base']).toBe(theme.background.base);
    expect(cssVars['ink-demo-bg-surface']).toBe(theme.background.surface);
    expect(cssVars['ink-demo-bg-container']).toBe(theme.background.container);

    expect(cssVars['ink-demo-text-primary']).toBe(theme.text.primary);
    expect(cssVars['ink-demo-text-secondary']).toBe(theme.text.secondary);
    expect(cssVars['ink-demo-text-placeholder']).toBe(theme.text.placeholder);

    expect(cssVars['ink-demo-border']).toBe(theme.border.base);
    expect(cssVars['ink-demo-border-secondary']).toBe(theme.border.secondary);

    expect(cssVars['ink-demo-grid-line']).toBe(theme.component.gridLine);
    expect(cssVars['ink-demo-header-bg']).toBe(theme.component.headerBg);
    expect(cssVars['ink-demo-header-bg-active']).toBe(theme.component.headerBgActive);
  });

  it('should synchronize Dark Theme colors', () => {
    const cssVars = parseCssVariables(cssContent, "html[data-theme='dark']");
    const theme = Themes.dark;

    // Check specific mappings
    expect(cssVars['ink-demo-bg-base']).toBe(theme.background.base);
    expect(cssVars['ink-demo-bg-surface']).toBe(theme.background.surface);
    expect(cssVars['ink-demo-bg-container']).toBe(theme.background.container);

    expect(cssVars['ink-demo-text-primary']).toBe(theme.text.primary);
    expect(cssVars['ink-demo-text-secondary']).toBe(theme.text.secondary);
    expect(cssVars['ink-demo-text-placeholder']).toBe(theme.text.placeholder);

    expect(cssVars['ink-demo-border']).toBe(theme.border.base);
    expect(cssVars['ink-demo-border-secondary']).toBe(theme.border.secondary);

    expect(cssVars['ink-demo-grid-line']).toBe(theme.component.gridLine);
    expect(cssVars['ink-demo-header-bg']).toBe(theme.component.headerBg);
    expect(cssVars['ink-demo-header-bg-active']).toBe(theme.component.headerBgActive);
  });
});
