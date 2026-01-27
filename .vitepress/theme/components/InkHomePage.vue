<template>
  <div ref="mountEl" class="ink-react-mount" data-fullscreen="true"></div>
</template>

<script setup lang="ts">
/**
 * 首页容器组件：
 * - 在 VitePress 的 Vue 生命周期中挂载 React 首页
 * - SSR 阶段跳过挂载，避免访问 document/window
 */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { onBeforeUnmount, onMounted, ref } from 'vue';

import VitePressHome from '../../../src/vitepress/home';

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
  rootRef.value.render(React.createElement(VitePressHome as any));
});

onBeforeUnmount(() => {
  rootRef.value?.unmount();
  rootRef.value = null;
});
</script>
