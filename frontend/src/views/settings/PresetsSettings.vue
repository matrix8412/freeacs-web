<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Edit, Plus, QuestionFilled, Refresh } from '@element-plus/icons-vue';
import { api } from '../../api/client';
import TableColumnChooser from '../../components/TableColumnChooser.vue';
import { useDirtyDialog } from '../../composables/useDirtyDialog';
import { useTableColumns } from '../../composables/useTableColumns';
import type { Preset, Provision } from '../../types';

const loading = ref(false);
const dialogOpen = ref(false);
const editingName = ref<string | null>(null);
const presets = ref<Preset[]>([]);
const provisions = ref<Provision[]>([]);
const form = reactive({
  name: '',
  channel: 'default',
  weight: 0,
  events: '',
  precondition: '{}',
  provision: '',
  arguments: ''
});
const presetDialog = useDirtyDialog(() => ({ ...form }), () => {
  dialogOpen.value = false;
});
const presetColumns = [
  { id: 'name', label: 'Name' },
  { id: 'channel', label: 'Channel' },
  { id: 'weight', label: 'Weight' },
  { id: 'events', label: 'Events' },
  { id: 'provision', label: 'Provision' },
  { id: 'arguments', label: 'Arguments' },
  { id: 'actions', label: 'Actions' }
];
const { isColumnVisible, saveColumns, visibleColumns } = useTableColumns('settings.presets', presetColumns);

const provisionOptions = computed(() => provisions.value.map((provision) => provision.name));

async function load() {
  loading.value = true;
  try {
    const [presetResponse, provisionResponse] = await Promise.all([api.get('/settings/presets'), api.get('/settings/provisions')]);
    presets.value = presetResponse.data.presets;
    provisions.value = provisionResponse.data.provisions;
  } catch {
    ElMessage.error('Unable to load presets');
  } finally {
    loading.value = false;
  }
}

function createPreset() {
  editingName.value = null;
  Object.assign(form, {
    name: '',
    channel: 'default',
    weight: 0,
    events: '',
    precondition: '{}',
    provision: provisionOptions.value[0] || '',
    arguments: ''
  });
  presetDialog.captureSnapshot();
  dialogOpen.value = true;
}

function editPreset(preset: Preset) {
  editingName.value = preset.name;
  Object.assign(form, {
    name: preset.name,
    channel: preset.channel,
    weight: preset.weight,
    events: Object.keys(preset.events || {}).length ? JSON.stringify(preset.events, null, 2) : '',
    precondition: preset.precondition || '{}',
    provision: preset.provision,
    arguments: preset.arguments?.length ? JSON.stringify(preset.arguments, null, 2) : ''
  });
  presetDialog.captureSnapshot();
  dialogOpen.value = true;
}

async function savePreset() {
  try {
    const response = editingName.value ? await api.put(`/settings/presets/${encodeURIComponent(editingName.value)}`, form) : await api.post('/settings/presets', form);
    presets.value = response.data.presets;
    dialogOpen.value = false;
    ElMessage.success('Preset saved');
  } catch {
    ElMessage.error('Unable to save preset');
  }
}

async function deletePreset(preset: Preset) {
  await ElMessageBox.confirm(`Delete preset ${preset.name}?`, 'Delete Preset', {
    type: 'warning',
    confirmButtonText: 'Delete'
  });

  try {
    const { data } = await api.delete(`/settings/presets/${encodeURIComponent(preset.name)}`);
    presets.value = data.presets;
    ElMessage.success('Preset deleted');
  } catch {
    ElMessage.error('Unable to delete preset');
  }
}

function eventNames(events: Record<string, boolean>) {
  return Object.entries(events || {})
    .filter(([, enabled]) => enabled)
    .map(([event]) => event);
}

onMounted(load);
</script>

<template>
  <section class="toolbar">
    <div>
      <h2>Presets</h2>
      <p>{{ presets.length }} mappings</p>
    </div>
    <div class="toolbar-actions">
      <TableColumnChooser v-model="visibleColumns" :columns="presetColumns" @save="saveColumns" />
      <el-tooltip content="Refresh" placement="top">
        <el-button :icon="Refresh" circle :loading="loading" @click="load" />
      </el-tooltip>
      <el-button type="primary" :icon="Plus" @click="createPreset">New Preset</el-button>
    </div>
  </section>

  <section class="panel">
    <el-table :data="presets" v-loading="loading" stripe>
      <el-table-column v-if="isColumnVisible('name')" prop="name" label="Name" min-width="180" />
      <el-table-column v-if="isColumnVisible('channel')" prop="channel" label="Channel" min-width="140" />
      <el-table-column v-if="isColumnVisible('weight')" prop="weight" label="Weight" width="100" />
      <el-table-column v-if="isColumnVisible('events')" label="Events" min-width="220">
        <template #default="{ row }">
          <el-tag v-for="event in eventNames(row.events)" :key="event" class="tag-gap" effect="plain">{{ event }}</el-tag>
          <span v-if="!eventNames(row.events).length">-</span>
        </template>
      </el-table-column>
      <el-table-column v-if="isColumnVisible('provision')" prop="provision" label="Provision" min-width="180" />
      <el-table-column v-if="isColumnVisible('arguments')" label="Arguments" width="120">
        <template #default="{ row }">{{ row.arguments?.length || 0 }}</template>
      </el-table-column>
      <el-table-column v-if="isColumnVisible('actions')" label="Actions" width="130" fixed="right">
        <template #default="{ row }">
          <el-tooltip content="Edit" placement="top"><el-button :icon="Edit" circle @click="editPreset(row)" /></el-tooltip>
          <el-tooltip content="Delete" placement="top"><el-button :icon="Delete" circle type="danger" plain @click="deletePreset(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
  </section>

  <el-dialog v-model="dialogOpen" :before-close="presetDialog.beforeClose" class="preset-dialog" width="820px">
    <template #header>
      <span class="el-dialog__title">{{ editingName ? 'Edit Preset' : 'New Preset' }}</span>
      <el-popover placement="bottom-end" trigger="click" width="440">
        <template #reference>
          <el-button class="preset-help-button" :icon="QuestionFilled" circle aria-label="Preset help" />
        </template>
        <div class="preset-help">
          <strong>Preset fields</strong>
          <dl>
            <dt>Name</dt>
            <dd><code>fiber-bootstrap</code></dd>
            <dt>Channel</dt>
            <dd><code>default</code> or <code>bootstrap</code></dd>
            <dt>Weight</dt>
            <dd><code>10</code></dd>
            <dt>Events</dt>
            <dd><code>{"1 BOOT": true, "0 BOOTSTRAP": true}</code></dd>
            <dt>Precondition</dt>
            <dd><code>{"_tags": "fiber"}</code></dd>
            <dt>Provision</dt>
            <dd><code>set-wan-and-wifi</code></dd>
            <dt>Arguments</dt>
            <dd><code>["pppoe-user", "pppoe-password"]</code></dd>
          </dl>
        </div>
      </el-popover>
    </template>
    <el-form label-position="top">
      <div class="form-grid">
        <el-form-item label="Name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="Channel">
          <el-select v-model="form.channel" filterable allow-create default-first-option>
            <el-option label="default" value="default" />
            <el-option label="bootstrap" value="bootstrap" />
          </el-select>
        </el-form-item>
        <el-form-item label="Weight">
          <el-input-number v-model="form.weight" :min="-100000" :max="100000" />
        </el-form-item>
        <el-form-item label="Provision">
          <el-select v-model="form.provision" filterable>
            <el-option v-for="provision in provisionOptions" :key="provision" :label="provision" :value="provision" />
          </el-select>
        </el-form-item>
      </div>
      <el-form-item label="Events">
        <el-input v-model="form.events" class="code-input" type="textarea" :rows="4" placeholder='{"1 BOOT": true}' />
      </el-form-item>
      <el-form-item label="Precondition">
        <el-input v-model="form.precondition" class="code-input" type="textarea" :rows="6" placeholder='{"_tags": "test"}' />
      </el-form-item>
      <el-form-item label="Arguments">
        <el-input v-model="form.arguments" class="code-input" type="textarea" :rows="5" placeholder='["customer", "wan"]' />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="presetDialog.requestClose">Cancel</el-button>
      <el-button type="primary" @click="savePreset">Save Preset</el-button>
    </template>
  </el-dialog>
</template>
