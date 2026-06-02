<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { Setting } from '@element-plus/icons-vue';
import type { TableColumnOption } from '../composables/useTableColumns';

const props = defineProps<{
  columns: TableColumnOption[];
  modelValue: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
  save: [value: string[]];
}>();

function handleChange(value: unknown) {
  const nextColumns = Array.isArray(value) ? value.map(String) : [];

  if (!nextColumns.length) {
    const fallback = props.columns[0] ? [props.columns[0].id] : [];
    emit('update:modelValue', fallback);
    emit('save', fallback);
    ElMessage.warning('At least one column must stay visible');
    return;
  }

  emit('update:modelValue', nextColumns);
  emit('save', nextColumns);
}
</script>

<template>
  <el-popover placement="bottom-end" trigger="click" width="240">
    <template #reference>
      <el-tooltip content="Columns" placement="top">
        <el-button :icon="Setting" circle aria-label="Table columns" />
      </el-tooltip>
    </template>
    <div class="column-chooser">
      <strong>Columns</strong>
      <el-checkbox-group :model-value="modelValue" class="column-chooser__list" @change="handleChange">
        <el-checkbox v-for="column in columns" :key="column.id" :label="column.id">{{ column.label }}</el-checkbox>
      </el-checkbox-group>
    </div>
  </el-popover>
</template>

