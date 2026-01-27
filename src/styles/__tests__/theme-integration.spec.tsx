/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getCurrentThemeMode,
  setThemePreset,
  subscribeTheme,
  Themes,
  type ThemePalette,
} from '../theme';

import { Center, Container, StatelessWidget, Text, type Widget } from '@/core';

// Mock Canvas2DRenderer
const mockRenderer = {
  initialize: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn(),
  render: vi.fn(),
  drawRect: vi.fn(),
  drawText: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  getRawInstance: () => ({
    canvas: {
      width: 800,
      height: 600,
      dataset: {},
      style: {},
      getContext: () => ({
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        measureText: () => ({
          width: 10,
          actualBoundingBoxAscent: 10,
          actualBoundingBoxDescent: 2,
        }),
      }),
    },
  }),
  update: vi.fn(),
};

// Mock Runtime
vi.mock('@/runtime', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    default: class MockRuntime extends actual.default {
      createRenderer() {
        return mockRenderer;
      }
    },
  };
});

// Test Widget that uses theme
class ThemeTestWidget extends StatelessWidget<{ theme: ThemePalette }> {
  render(): Widget {
    return (
      <Container width={100} height={100} color={this.props.theme.primary}>
        <Center>
          <Text text="Theme Test" color={this.props.theme.text.primary} />
        </Center>
      </Container>
    );
  }
}

describe('Theme Switching Integration', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    // Reset theme
    document.documentElement.setAttribute('data-theme', 'light');
    setThemePreset('glass');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('should detect theme change from light to dark', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);

    // Change theme
    document.documentElement.setAttribute('data-theme', 'dark');

    // Wait for MutationObserver
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(listener).toHaveBeenCalled();
    const args = listener.mock.calls[0];
    expect(args[1]).toBe('dark'); // mode
    expect(args[0].primary).toBe(Themes.dark.primary);

    unsubscribe();
  });

  it('should provide correct initial theme', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(getCurrentThemeMode()).toBe('dark');
  });

  it('切换配色时应通知订阅者并更新主题主色', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);

    setThemePreset('material');

    expect(listener).toHaveBeenCalled();
    expect(Themes.light.primary).toBe('#00838f');

    setThemePreset('glass');
    unsubscribe();
  });
});
