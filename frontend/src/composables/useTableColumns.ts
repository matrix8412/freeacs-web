import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { api } from '../api/client';

export type TableColumnOption = {
  id: string;
  label: string;
  defaultVisible?: boolean;
};

function defaultVisibleColumns(columns: TableColumnOption[]) {
  return columns.filter((column) => column.defaultVisible !== false).map((column) => column.id);
}

export function useTableColumns(tableKey: string, columns: TableColumnOption[]) {
  const visibleColumns = ref<string[]>(defaultVisibleColumns(columns));
  const loadingColumns = ref(false);
  const columnIds = new Set(columns.map((column) => column.id));

  function normalize(nextColumns: string[]) {
    const normalized = nextColumns.filter((column) => columnIds.has(column));
    return normalized.length ? normalized : defaultVisibleColumns(columns).slice(0, 1);
  }

  async function loadColumns() {
    loadingColumns.value = true;
    try {
      const { data } = await api.get(`/preferences/tables/${encodeURIComponent(tableKey)}`);
      const savedColumns = data.preference?.visibleColumns || [];
      visibleColumns.value = savedColumns.length ? normalize(savedColumns) : defaultVisibleColumns(columns);
    } catch {
      visibleColumns.value = defaultVisibleColumns(columns);
    } finally {
      loadingColumns.value = false;
    }
  }

  async function saveColumns(nextColumns: string[]) {
    const normalized = normalize(nextColumns);
    visibleColumns.value = normalized;

    try {
      await api.put(`/preferences/tables/${encodeURIComponent(tableKey)}`, {
        visibleColumns: normalized
      });
    } catch {
      ElMessage.error('Unable to save table columns');
    }
  }

  function isColumnVisible(columnId: string) {
    return visibleColumns.value.includes(columnId);
  }

  onMounted(loadColumns);

  return {
    columns,
    isColumnVisible,
    loadingColumns,
    saveColumns,
    visibleColumns
  };
}

