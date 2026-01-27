<template>
  <div ref="mountEl" class="ink-react-mount"></div>
</template>

<script setup lang="ts">
/**
 * Benchmark 页面容器：
 * - 在 VitePress 中挂载 React BenchmarkApp
 * - SSR 阶段跳过挂载，避免访问 DOM API
 */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { onBeforeUnmount, onMounted, ref } from 'vue';

import { BenchmarkApp } from '../../../src/benchmark/index';

const mountEl = ref<HTMLElement | null>(null);
const rootRef = ref<Root | null>(null);

onMounted(() => {
  if (import.meta.env.SSR) {
    return;
  }
  const el = mountEl.value;
  if (!el) {
    return;
  }
  rootRef.value = createRoot(el);
  rootRef.value.render(React.createElement(BenchmarkApp as any));
});

onBeforeUnmount(() => {
  rootRef.value?.unmount();
  rootRef.value = null;
});
</script>
