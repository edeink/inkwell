<template>
  <div v-if="isSSR" class="vp-code-group">
    <pre><code>{{ decodedCode }}</code></pre>
  </div>
  <div v-else class="ink-mermaid">
    <div ref="containerEl"></div>
  </div>
</template>

<script setup lang="ts">
import mermaid from 'mermaid';
import { computed, onMounted, ref, watch } from 'vue';
import { useData } from 'vitepress';

type Props = {
  codeBase64: string;
};

const props = defineProps<Props>();
const { isDark } = useData();

const isSSR = import.meta.env.SSR;
const containerEl = ref<HTMLElement | null>(null);

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

async function renderMermaid() {
  if (isSSR) {
    return;
  }
  const el = containerEl.value;
  if (!el) {
    return;
  }
  const code = decodedCode.value.trim();
  if (!code) {
    el.innerHTML = '';
    return;
  }
  const id = `ink-mermaid-${Math.random().toString(36).slice(2)}`;
  mermaid.initialize({ startOnLoad: false, theme: isDark.value ? 'dark' : 'default' });
  const out = await mermaid.render(id, code);
  el.innerHTML = out.svg;
}

onMounted(() => {
  void renderMermaid();
});

watch([decodedCode, isDark], () => {
  void renderMermaid();
});
</script>

<style scoped>
.ink-mermaid {
  width: 100%;
  overflow-x: auto;
}
</style>
