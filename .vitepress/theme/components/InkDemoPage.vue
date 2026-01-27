<template>
  <div ref="mountEl" class="ink-react-mount" data-fullscreen="true"></div>
</template>

<script setup lang="ts">
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { onBeforeUnmount, onMounted, ref } from 'vue';

import UnifiedDemo from '../../../src/demo';

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
  rootRef.value.render(React.createElement(UnifiedDemo as any));
});

onBeforeUnmount(() => {
  rootRef.value?.unmount();
  rootRef.value = null;
});
</script>

