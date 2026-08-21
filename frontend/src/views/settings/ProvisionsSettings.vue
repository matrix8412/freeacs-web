<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Edit, Plus } from '@element-plus/icons-vue';
import { api } from '../../api/client';
import TableColumnChooser from '../../components/TableColumnChooser.vue';
import { useDirtyDialog } from '../../composables/useDirtyDialog';
import { useTableColumns } from '../../composables/useTableColumns';
import HighlightedTextarea from '../../components/HighlightedTextarea.vue';
import type { Provision } from '../../types';

const loading = ref(false);
const dialogOpen = ref(false);
const editingName = ref<string | null>(null);
const provisions = ref<Provision[]>([]);
const form = reactive({
  name: '',
  script: ''
});
const provisionDialog = useDirtyDialog(() => ({ ...form }), () => {
  dialogOpen.value = false;
});
const provisionColumns = [
  { id: 'name', label: 'Name' },
  { id: 'script', label: 'Script' },
  { id: 'actions', label: 'Actions' }
];
const { isColumnVisible, saveColumns, visibleColumns } = useTableColumns('settings.provisions', provisionColumns);

const provisionDialogWidth = computed(() => {
  const longestLine = Math.max(0, ...form.script.split(/\r?\n/).map((line) => line.length));
  const contentWidth = Math.min(Math.ceil(longestLine * 8 + 150), 1400);
  return `min(max(780px, ${contentWidth}px), calc(100vw - 48px))`;
});

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/settings/provisions');
    provisions.value = data.provisions;
  } catch {
    ElMessage.error('Unable to load provisions');
  } finally {
    loading.value = false;
  }
}

function createProvision() {
  editingName.value = null;
  Object.assign(form, { name: '', script: '' });
  provisionDialog.captureSnapshot();
  dialogOpen.value = true;
}

function editProvision(provision: Provision) {
  editingName.value = provision.name;
  Object.assign(form, {
    name: provision.name,
    script: provision.script
  });
  provisionDialog.captureSnapshot();
  dialogOpen.value = true;
}

async function saveProvision() {
  try {
    const response = editingName.value ? await api.put(`/settings/provisions/${encodeURIComponent(editingName.value)}`, form) : await api.post('/settings/provisions', form);
    provisions.value = response.data.provisions;
    dialogOpen.value = false;
    ElMessage.success('Provision saved');
  } catch {
    ElMessage.error('Unable to save provision');
  }
}

async function deleteProvision(provision: Provision) {
  await ElMessageBox.confirm(`Delete provision ${provision.name}?`, 'Delete Provision', {
    type: 'warning',
    confirmButtonText: 'Delete'
  });

  try {
    const { data } = await api.delete(`/settings/provisions/${encodeURIComponent(provision.name)}`);
    provisions.value = data.provisions;
    ElMessage.success('Provision deleted');
  } catch {
    ElMessage.error('Unable to delete provision');
  }
}

function scriptPreview(script: string) {
  const compact = script.replace(/\s+/g, ' ').trim();
  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
}

onMounted(load);
</script>

<template>
  <section class="toolbar">
    <div>
      <h2>Provisions</h2>
      <p>{{ provisions.length }} scripts</p>
    </div>
    <div class="toolbar-actions">
      <TableColumnChooser v-model="visibleColumns" :columns="provisionColumns" @save="saveColumns" />
      <el-button type="primary" :icon="Plus" @click="createProvision">New Provision</el-button>
    </div>
  </section>

  <section class="panel">
    <el-table :data="provisions" v-loading="loading" stripe>
      <el-table-column v-if="isColumnVisible('name')" prop="name" label="Name" min-width="220" />
      <el-table-column v-if="isColumnVisible('script')" label="Script" min-width="420">
        <template #default="{ row }">
          <code class="inline-code">{{ scriptPreview(row.script) || '-' }}</code>
        </template>
      </el-table-column>
      <el-table-column v-if="isColumnVisible('actions')" label="Actions" width="130" fixed="right">
        <template #default="{ row }">
          <el-tooltip content="Edit" placement="top"><el-button :icon="Edit" circle @click="editProvision(row)" /></el-tooltip>
          <el-tooltip content="Delete" placement="top"><el-button :icon="Delete" circle type="danger" plain @click="deleteProvision(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
  </section>

  <el-dialog v-model="dialogOpen" :before-close="provisionDialog.beforeClose" :title="editingName ? 'Edit Provision' : 'New Provision'" :width="provisionDialogWidth">
    <el-form label-position="top">
      <el-form-item label="Name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="Script">
        <p class="provision-help">Tag condition example: <code>if (declare("Tags.premium", { value: 1 }).value[0]) { declare("Device.DeviceInfo.PeriodicInformInterval", null, { value: 300 }); }</code>. Use <code>!declare("Tags.premium", { value: 1 }).value[0]</code> for devices without a tag.</p>
        <HighlightedTextarea v-model="form.script" :rows="18" placeholder='log("Provision script");' />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="provisionDialog.requestClose">Cancel</el-button>
      <el-button type="primary" @click="saveProvision">Save Provision</el-button>
    </template>
  </el-dialog>
</template>
