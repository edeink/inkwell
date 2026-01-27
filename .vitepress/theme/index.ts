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
