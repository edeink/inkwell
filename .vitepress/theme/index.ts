import DefaultTheme from 'vitepress/theme';

import { setThemeMode } from '../../src/styles/theme';

import InkBenchmarkPage from './components/InkBenchmarkPage.vue';
import InkCodeBlock from './components/InkCodeBlock.vue';
import InkDemoPage from './components/InkDemoPage.vue';
import InkHomePage from './components/InkHomePage.vue';
import InkMermaidBlock from './components/InkMermaidBlock.vue';

import './style.css';

import type { EnhanceAppContext, Theme } from 'vitepress';

export default {
  extends: DefaultTheme,
  enhanceApp(ctx: EnhanceAppContext) {
    DefaultTheme.enhanceApp?.(ctx);
    const { app } = ctx;
    app.component('InkCodeBlock', InkCodeBlock);
    app.component('InkMermaidBlock', InkMermaidBlock);
    app.component('InkHomePage', InkHomePage);
    app.component('InkDemoPage', InkDemoPage);
    app.component('InkBenchmarkPage', InkBenchmarkPage);

    if (typeof window !== 'undefined') {
      const w = window as unknown as { __INK_VP_PINCH_BLOCKED__?: boolean };
      if (!w.__INK_VP_PINCH_BLOCKED__) {
        w.__INK_VP_PINCH_BLOCKED__ = true;
        const allowPinch = (target: EventTarget | null) => {
          const el = target instanceof Element ? target : null;
          return !!el?.closest?.('[data-ink-allow-pinch="true"]');
        };
        window.addEventListener(
          'wheel',
          (e) => {
            if (!e.ctrlKey) {
              return;
            }
            if (allowPinch(e.target)) {
              return;
            }
            e.preventDefault();
          },
          { capture: true, passive: false },
        );
        const preventGesture = (e: Event) => {
          if (allowPinch(e.target)) {
            return;
          }
          e.preventDefault();
        };
        window.addEventListener('gesturestart', preventGesture, { passive: false });
        window.addEventListener('gesturechange', preventGesture, { passive: false });
        window.addEventListener('gestureend', preventGesture, { passive: false });
      }
    }

    if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
      const sync = () => {
        setThemeMode(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      };
      sync();
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.attributeName === 'class') {
            sync();
            break;
          }
        }
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
  },
} satisfies Theme;
