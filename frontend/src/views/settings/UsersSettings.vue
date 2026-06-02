<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Delete, Edit, Key, Plus } from '@element-plus/icons-vue';
import { api } from '../../api/client';
import TableColumnChooser from '../../components/TableColumnChooser.vue';
import { useDirtyDialog } from '../../composables/useDirtyDialog';
import { useTableColumns } from '../../composables/useTableColumns';
import type { Group, User } from '../../types';

const loading = ref(false);
const dialogOpen = ref(false);
const passwordDialogOpen = ref(false);
const editingId = ref<string | null>(null);
const passwordUserId = ref<string | null>(null);
const users = ref<User[]>([]);
const groups = ref<Group[]>([]);
const userForm = reactive({
  email: '',
  name: '',
  password: '',
  groupIds: [] as string[],
  status: 'active'
});
const passwordForm = reactive({
  password: ''
});
const userDialog = useDirtyDialog(() => ({ ...userForm }), () => {
  dialogOpen.value = false;
});
const passwordDialog = useDirtyDialog(() => ({ ...passwordForm }), () => {
  passwordDialogOpen.value = false;
});
const userColumns = [
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'groups', label: 'Groups' },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Actions' }
];
const { isColumnVisible, saveColumns, visibleColumns } = useTableColumns('settings.users', userColumns);

async function load() {
  loading.value = true;
  try {
    const [usersResponse, groupsResponse] = await Promise.all([api.get('/settings/users'), api.get('/settings/groups')]);
    users.value = usersResponse.data.users;
    groups.value = groupsResponse.data.groups;
  } catch {
    ElMessage.error('Unable to load users');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  editingId.value = null;
  Object.assign(userForm, { email: '', name: '', password: '', groupIds: [], status: 'active' });
}

function createUser() {
  resetForm();
  userDialog.captureSnapshot();
  dialogOpen.value = true;
}

function editUser(user: User) {
  editingId.value = user.id;
  Object.assign(userForm, {
    email: user.email,
    name: user.name,
    password: '',
    groupIds: user.groups.map((group) => group.id),
    status: user.status
  });
  userDialog.captureSnapshot();
  dialogOpen.value = true;
}

async function saveUser() {
  try {
    if (editingId.value) {
      const { data } = await api.put(`/settings/users/${editingId.value}`, userForm);
      users.value = data.users;
    } else {
      const { data } = await api.post('/settings/users', userForm);
      users.value = data.users;
    }
    dialogOpen.value = false;
    ElMessage.success('User saved');
  } catch {
    ElMessage.error('Unable to save user');
  }
}

async function disableUser(user: User) {
  try {
    const { data } = await api.delete(`/settings/users/${user.id}`);
    users.value = data.users;
    ElMessage.success('User disabled');
  } catch {
    ElMessage.error('Unable to disable user');
  }
}

function openPasswordDialog(user: User) {
  passwordUserId.value = user.id;
  passwordForm.password = '';
  passwordDialog.captureSnapshot();
  passwordDialogOpen.value = true;
}

async function savePassword() {
  if (!passwordUserId.value) return;
  try {
    await api.post(`/settings/users/${passwordUserId.value}/password`, passwordForm);
    passwordDialogOpen.value = false;
    ElMessage.success('Password updated');
  } catch {
    ElMessage.error('Unable to update password');
  }
}

onMounted(load);
</script>

<template>
  <section class="toolbar">
    <div>
      <h2>Users</h2>
      <p>{{ users.length }} accounts</p>
    </div>
    <div class="toolbar-actions">
      <TableColumnChooser v-model="visibleColumns" :columns="userColumns" @save="saveColumns" />
      <el-button type="primary" :icon="Plus" @click="createUser">New User</el-button>
    </div>
  </section>

  <section class="panel">
    <el-table :data="users" v-loading="loading" stripe>
      <el-table-column v-if="isColumnVisible('name')" prop="name" label="Name" min-width="170" />
      <el-table-column v-if="isColumnVisible('email')" prop="email" label="Email" min-width="220" />
      <el-table-column v-if="isColumnVisible('groups')" label="Groups" min-width="220">
        <template #default="{ row }">
          <el-tag v-for="group in row.groups" :key="group.id" class="tag-gap">{{ group.name }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="isColumnVisible('status')" label="Status" width="120">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="isColumnVisible('actions')" label="Actions" width="170" fixed="right">
        <template #default="{ row }">
          <el-tooltip content="Edit" placement="top"><el-button :icon="Edit" circle @click="editUser(row)" /></el-tooltip>
          <el-tooltip content="Password" placement="top"><el-button :icon="Key" circle @click="openPasswordDialog(row)" /></el-tooltip>
          <el-tooltip content="Disable" placement="top"><el-button :icon="Delete" circle type="danger" plain @click="disableUser(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
  </section>

  <el-dialog v-model="dialogOpen" :before-close="userDialog.beforeClose" :title="editingId ? 'Edit User' : 'New User'" width="560px">
    <el-form label-position="top">
      <el-form-item label="Name"><el-input v-model="userForm.name" /></el-form-item>
      <el-form-item label="Email"><el-input v-model="userForm.email" type="email" /></el-form-item>
      <el-form-item v-if="!editingId" label="Password"><el-input v-model="userForm.password" type="password" show-password /></el-form-item>
      <el-form-item label="Groups">
        <el-select v-model="userForm.groupIds" multiple filterable>
          <el-option v-for="group in groups" :key="group._id" :label="group.name" :value="group._id" />
        </el-select>
      </el-form-item>
      <el-form-item label="Status">
        <el-segmented
          v-model="userForm.status"
          :options="[
            { label: 'Active', value: 'active' },
            { label: 'Disabled', value: 'disabled' }
          ]"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="userDialog.requestClose">Cancel</el-button>
      <el-button type="primary" @click="saveUser">Save User</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="passwordDialogOpen" :before-close="passwordDialog.beforeClose" title="Update Password" width="460px">
    <el-form label-position="top">
      <el-form-item label="New password"><el-input v-model="passwordForm.password" type="password" show-password /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="passwordDialog.requestClose">Cancel</el-button>
      <el-button type="primary" @click="savePassword">Update Password</el-button>
    </template>
  </el-dialog>
</template>
