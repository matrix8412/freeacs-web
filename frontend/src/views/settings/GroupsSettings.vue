<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Delete, Edit, Plus } from '@element-plus/icons-vue';
import { api } from '../../api/client';
import TableColumnChooser from '../../components/TableColumnChooser.vue';
import { useDirtyDialog } from '../../composables/useDirtyDialog';
import { useTableColumns } from '../../composables/useTableColumns';
import type { Group } from '../../types';

const loading = ref(false);
const dialogOpen = ref(false);
const editingId = ref<string | null>(null);
const groups = ref<Group[]>([]);
const permissions = ref<string[]>([]);
const groupForm = reactive({
  name: '',
  description: '',
  permissions: [] as string[]
});
const groupDialog = useDirtyDialog(() => ({ ...groupForm }), () => {
  dialogOpen.value = false;
});
const groupColumns = [
  { id: 'name', label: 'Name' },
  { id: 'description', label: 'Description' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'actions', label: 'Actions' }
];
const { isColumnVisible, saveColumns, visibleColumns } = useTableColumns('settings.groups', groupColumns);

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/settings/groups');
    groups.value = data.groups;
    permissions.value = data.permissions;
  } catch {
    ElMessage.error('Unable to load user groups');
  } finally {
    loading.value = false;
  }
}

function createGroup() {
  editingId.value = null;
  Object.assign(groupForm, { name: '', description: '', permissions: [] });
  groupDialog.captureSnapshot();
  dialogOpen.value = true;
}

function editGroup(group: Group) {
  editingId.value = group._id;
  Object.assign(groupForm, {
    name: group.name,
    description: group.description,
    permissions: [...group.permissions]
  });
  groupDialog.captureSnapshot();
  dialogOpen.value = true;
}

async function saveGroup() {
  try {
    const response = editingId.value ? await api.put(`/settings/groups/${editingId.value}`, groupForm) : await api.post('/settings/groups', groupForm);
    groups.value = response.data.groups;
    permissions.value = response.data.permissions;
    dialogOpen.value = false;
    ElMessage.success('Group saved');
  } catch {
    ElMessage.error('Unable to save group');
  }
}

async function deleteGroup(group: Group) {
  try {
    const { data } = await api.delete(`/settings/groups/${group._id}`);
    groups.value = data.groups;
    permissions.value = data.permissions;
    ElMessage.success('Group deleted');
  } catch {
    ElMessage.error('Unable to delete group');
  }
}

onMounted(load);
</script>

<template>
  <section class="toolbar">
    <div>
      <h2>User Groups</h2>
      <p>{{ groups.length }} groups</p>
    </div>
    <div class="toolbar-actions">
      <TableColumnChooser v-model="visibleColumns" :columns="groupColumns" @save="saveColumns" />
      <el-button type="primary" :icon="Plus" @click="createGroup">New Group</el-button>
    </div>
  </section>

  <section class="panel">
    <el-table :data="groups" v-loading="loading" stripe>
      <el-table-column v-if="isColumnVisible('name')" prop="name" label="Name" min-width="180" />
      <el-table-column v-if="isColumnVisible('description')" prop="description" label="Description" min-width="260" />
      <el-table-column v-if="isColumnVisible('permissions')" label="Permissions" min-width="320">
        <template #default="{ row }">
          <el-tag v-for="permission in row.permissions" :key="permission" class="tag-gap" effect="plain">{{ permission }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="isColumnVisible('actions')" label="Actions" width="130" fixed="right">
        <template #default="{ row }">
          <el-tooltip content="Edit" placement="top"><el-button :icon="Edit" circle @click="editGroup(row)" /></el-tooltip>
          <el-tooltip content="Delete" placement="top"><el-button :icon="Delete" circle type="danger" plain :disabled="row.system" @click="deleteGroup(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
  </section>

  <el-dialog v-model="dialogOpen" :before-close="groupDialog.beforeClose" :title="editingId ? 'Edit Group' : 'New Group'" width="620px">
    <el-form label-position="top">
      <el-form-item label="Name"><el-input v-model="groupForm.name" /></el-form-item>
      <el-form-item label="Description"><el-input v-model="groupForm.description" type="textarea" :rows="3" /></el-form-item>
      <el-form-item label="Permissions">
        <el-checkbox-group v-model="groupForm.permissions" class="permission-list">
          <el-checkbox v-for="permission in permissions" :key="permission" :label="permission">{{ permission }}</el-checkbox>
        </el-checkbox-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="groupDialog.requestClose">Cancel</el-button>
      <el-button type="primary" @click="saveGroup">Save Group</el-button>
    </template>
  </el-dialog>
</template>
