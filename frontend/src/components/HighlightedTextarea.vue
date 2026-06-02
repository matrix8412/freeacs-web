<script setup lang="ts">
import { computed, ref } from 'vue';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import 'highlight.js/styles/github.css';

hljs.registerLanguage('javascript', javascript);

const props = withDefaults(
  defineProps<{
    modelValue: string;
    rows?: number;
    language?: string;
    placeholder?: string;
  }>(),
  {
    rows: 16,
    language: 'javascript',
    placeholder: ''
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const highlightLayer = ref<HTMLElement | null>(null);

const highlightedHtml = computed(() => {
  const value = props.modelValue || '';
  const highlighted = hljs.getLanguage(props.language) ? hljs.highlight(value, { language: props.language, ignoreIllegals: true }).value : hljs.highlightAuto(value).value;
  return highlighted || '&nbsp;';
});

const editorHeight = computed(() => `${Math.max(props.rows, 6) * 20 + 28}px`);

function updateValue(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value);
}

function syncScroll(event: Event) {
  if (!highlightLayer.value) return;
  const target = event.target as HTMLTextAreaElement;
  highlightLayer.value.scrollTop = target.scrollTop;
}
</script>

<template>
  <div class="highlight-editor" :style="{ height: editorHeight }">
    <pre ref="highlightLayer" class="highlight-editor__layer" aria-hidden="true"><code class="language-javascript" v-html="highlightedHtml" /></pre>
    <textarea
      class="highlight-editor__input"
      :value="modelValue"
      :placeholder="placeholder"
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      wrap="soft"
      @input="updateValue"
      @scroll="syncScroll"
    />
  </div>
</template>
