<template>
  <div v-if="isSSR" class="vp-code-group">
    <pre><code>{{ decodedCode }}</code></pre>
  </div>
  <div v-else ref="mountEl" class="ink-react-mount"></div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { createRoot, type Root } from 'react-dom/client';
import React from 'react';

import InkPlayground from '../../../src/site/components/ink-playground';

type Props = {
  codeBase64: string;
  lang?: string;
  meta?: string;
};

const props = defineProps<Props>();

const isSSR = import.meta.env.SSR;
const mountEl = ref<HTMLElement | null>(null);
const rootRef = ref<Root | null>(null);

function decodeBase64Utf8(base64: string) {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64').toString('utf8');
    }
  } catch {}
  try {
    const bin = atob(base64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

const decodedCode = computed(() => {
  return decodeBase64Utf8(props.codeBase64);
});

const mode = computed(() => {
  const m = (props.meta ?? '').match(/mode:(\w+)/);
  const v = (m?.[1] ?? '').trim();
  if (v === 'render' || v === 'edit' || v === 'readonly' || v === 'code') {
    return v;
  }
  return undefined;
});

function renderReact() {
  if (isSSR) {
    return;
  }
  const el = mountEl.value;
  if (!el) {
    return;
  }
  if (!rootRef.value) {
    rootRef.value = createRoot(el);
  }
  rootRef.value.render(React.createElement(InkPlayground as any, { code: decodedCode.value, mode: mode.value }));
}

onMounted(() => {
  renderReact();
});

watch([decodedCode, mode], () => {
  renderReact();
});

onBeforeUnmount(() => {
  rootRef.value?.unmount();
  rootRef.value = null;
});
</script>
