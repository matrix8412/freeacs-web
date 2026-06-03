<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Edit, Plus } from '@element-plus/icons-vue';
import { api } from '../../api/client';
import TableColumnChooser from '../../components/TableColumnChooser.vue';
import { useDirtyDialog } from '../../composables/useDirtyDialog';
import { useTableColumns } from '../../composables/useTableColumns';
import type { DeviceType } from '../../types';

const loading = ref(false);
const dialogOpen = ref(false);
const editingId = ref<string | null>(null);
const deviceTypes = ref<DeviceType[]>([]);
const form = reactive({
  name: '',
  imageDataUrl: ''
});
const deviceTypeDialog = useDirtyDialog(() => ({ ...form }), () => {
  dialogOpen.value = false;
});
const deviceTypeColumns = [
  { id: 'image', label: 'Image' },
  { id: 'name', label: 'Name' },
  { id: 'actions', label: 'Actions' }
];
const { isColumnVisible, saveColumns, visibleColumns } = useTableColumns('settings.device-types', deviceTypeColumns);

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/settings/device-types');
    deviceTypes.value = data.deviceTypes;
  } catch {
    ElMessage.error('Unable to load device types');
  } finally {
    loading.value = false;
  }
}

function createDeviceType() {
  editingId.value = null;
  Object.assign(form, { name: '', imageDataUrl: '' });
  deviceTypeDialog.captureSnapshot();
  dialogOpen.value = true;
}

function editDeviceType(deviceType: DeviceType) {
  editingId.value = deviceType._id;
  Object.assign(form, {
    name: deviceType.name,
    imageDataUrl: deviceType.imageDataUrl || ''
  });
  deviceTypeDialog.captureSnapshot();
  dialogOpen.value = true;
}

async function saveDeviceType() {
  try {
    const response = editingId.value ? await api.put(`/settings/device-types/${editingId.value}`, form) : await api.post('/settings/device-types', form);
    deviceTypes.value = response.data.deviceTypes;
    dialogOpen.value = false;
    ElMessage.success('Device type saved');
  } catch {
    ElMessage.error('Unable to save device type');
  }
}

async function deleteDeviceType(deviceType: DeviceType) {
  await ElMessageBox.confirm(`Delete device type ${deviceType.name}?`, 'Delete Device Type', {
    type: 'warning',
    confirmButtonText: 'Delete'
  });

  try {
    const { data } = await api.delete(`/settings/device-types/${deviceType._id}`);
    deviceTypes.value = data.deviceTypes;
    ElMessage.success('Device type deleted');
  } catch {
    ElMessage.error('Unable to delete device type');
  }
}

function removeImage() {
  form.imageDataUrl = '';
}

function readImage(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
    ElMessage.error('Use PNG, JPEG, GIF, or WebP image');
    return;
  }

  if (file.size > 650 * 1024) {
    ElMessage.error('Image must be smaller than 650 KB');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    form.imageDataUrl = typeof reader.result === 'string' ? reader.result : '';
  };
  reader.onerror = () => {
    ElMessage.error('Unable to read image');
  };
  reader.readAsDataURL(file);
}

onMounted(load);
</script>

<template>
  <section class="toolbar">
    <div>
      <h2>Device Types</h2>
      <p>{{ deviceTypes.length }} model mappings</p>
    </div>
    <div class="toolbar-actions">
      <TableColumnChooser v-model="visibleColumns" :columns="deviceTypeColumns" @save="saveColumns" />
      <el-button type="primary" :icon="Plus" @click="createDeviceType">New Device Type</el-button>
    </div>
  </section>

  <section class="panel">
    <el-table :data="deviceTypes" v-loading="loading" stripe>
      <el-table-column v-if="isColumnVisible('image')" label="Image" width="110">
        <template #default="{ row }">
          <img v-if="row.imageDataUrl" class="device-type-thumb" :src="row.imageDataUrl" :alt="row.name" />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column v-if="isColumnVisible('name')" prop="name" label="Name" min-width="260" />
      <el-table-column v-if="isColumnVisible('actions')" label="Actions" width="130" fixed="right">
        <template #default="{ row }">
          <el-tooltip content="Edit" placement="top"><el-button :icon="Edit" circle @click="editDeviceType(row)" /></el-tooltip>
          <el-tooltip content="Delete" placement="top"><el-button :icon="Delete" circle type="danger" plain @click="deleteDeviceType(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
  </section>

  <el-dialog v-model="dialogOpen" :before-close="deviceTypeDialog.beforeClose" :title="editingId ? 'Edit Device Type' : 'New Device Type'" width="560px">
    <el-form label-position="top">
      <el-form-item label="Name">
        <el-input v-model="form.name" placeholder="Exact model name from device" />
      </el-form-item>
      <el-form-item label="Image">
        <div class="device-type-upload">
          <img v-if="form.imageDataUrl" class="device-type-preview" :src="form.imageDataUrl" alt="Device type preview" />
          <div v-else class="device-type-empty">No image</div>
          <div class="device-type-upload-actions">
            <el-button>
              <label class="device-type-file-label">
                Upload Image
                <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" @change="readImage" />
              </label>
            </el-button>
            <el-button :disabled="!form.imageDataUrl" @click="removeImage">Remove</el-button>
          </div>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="deviceTypeDialog.requestClose">Cancel</el-button>
      <el-button type="primary" @click="saveDeviceType">Save Device Type</el-button>
    </template>
  </el-dialog>
</template>
