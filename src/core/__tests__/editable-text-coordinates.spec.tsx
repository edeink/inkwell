import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TextArea } from '../editable/textarea';

vi.mock('@/styles/theme', () => ({
  getCurrentThemeMode: () => 'light',
  Themes: {
    light: {
      state: {
        focus: 'rgba(1, 2, 3, 0.3)',
        selected: 'rgba(9, 9, 9, 0.2)',
      },
    },
  },
}));

describe('TextArea 视觉与主题', () => {
  let editor: TextArea;

  beforeEach(() => {
    document.body.innerHTML = '';
    editor = new TextArea({
      value: 'test',
      selectionColor: 'rgba(1, 1, 1, 0.5)',
    });
  });

  afterEach(() => {
    editor.dispose();
  });

  it('聚焦时应优先使用传入的 selectionColor', () => {
    (editor as any).setState({ focused: true });
    const color = (editor as any).resolveSelectionColor();
    expect(color).toBe('rgba(1, 1, 1, 0.5)');
  });

  it('非聚焦时应使用主题的 selected 颜色', () => {
    (editor as any).setState({ focused: false });
    const color = (editor as any).resolveSelectionColor();
    expect(color).toBe('rgba(9, 9, 9, 0.2)');
  });
});
