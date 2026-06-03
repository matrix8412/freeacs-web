<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Edit, Refresh, Search, Setting, SwitchButton, WarningFilled } from '@element-plus/icons-vue';
import axios from 'axios';
import { api } from '../api/client';
import TableColumnChooser from '../components/TableColumnChooser.vue';
import { useDirtyDialog } from '../composables/useDirtyDialog';
import { useTableColumns } from '../composables/useTableColumns';
import type { Device } from '../types';

type DeviceParameter = {
  path: string;
  value: string;
  type: string;
  writable: string;
  updated: string;
};

const loading = ref(false);
const devices = ref<Device[]>([]);
const selected = ref<Device | null>(null);
const drawerOpen = ref(false);
const activeDeviceTab = ref('overview');
const parameterSearch = ref('');
const parameterPage = ref(1);
const parameterPageSize = ref(100);
const parameterDialogOpen = ref(false);
const taskLoading = ref(false);
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  device: null as Device | null
});
const filters = reactive({
  search: '',
  status: 'all'
});
const parameterForm = reactive({
  parameterPath: '',
  parameterValue: '',
  parameterType: 'xsd:string'
});
const parameterDialog = useDirtyDialog(() => ({ ...parameterForm }), () => {
  parameterDialogOpen.value = false;
});
const deviceColumns = [
  { id: 'status', label: 'Status' },
  { id: 'serialNumber', label: 'Serial' },
  { id: 'manufacturer', label: 'Vendor' },
  { id: 'productClass', label: 'Model' },
  { id: 'softwareVersion', label: 'Firmware' },
  { id: 'firstAuthorizedAt', label: 'First authorized' },
  { id: 'lastInform', label: 'Last inform' },
  { id: 'actions', label: 'Actions' }
];
const { isColumnVisible, saveColumns, visibleColumns } = useTableColumns('devices.inventory', deviceColumns);

const deviceRows = computed(() => devices.value);
const parameterRows = computed(() => flattenDeviceParameters(selected.value?.raw));
const filteredParameterRows = computed(() => {
  const term = parameterSearch.value.trim().toLowerCase();
  if (!term) return parameterRows.value;

  return parameterRows.value.filter((parameter) =>
    [parameter.path, parameter.value, parameter.type, parameter.writable, parameter.updated].some((value) => value.toLowerCase().includes(term))
  );
});
const pagedParameterRows = computed(() => {
  const start = (parameterPage.value - 1) * parameterPageSize.value;
  return filteredParameterRows.value.slice(start, start + parameterPageSize.value);
});
const parameterPageStart = computed(() => {
  if (!filteredParameterRows.value.length) return 0;
  return (parameterPage.value - 1) * parameterPageSize.value + 1;
});
const parameterPageEnd = computed(() => Math.min(parameterPage.value * parameterPageSize.value, filteredParameterRows.value.length));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatParameterValue(value: unknown) {
  if (value === undefined) return '';
  if (value === null) return 'null';
  if (Array.isArray(value)) return formatParameterValue(value[0]);
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function parameterValue(node: Record<string, unknown>) {
  if ('_value' in node) return node._value;
  if ('value' in node) return node.value;
  return undefined;
}

function parameterType(node: Record<string, unknown>) {
  if (typeof node._type === 'string') return node._type;
  if (Array.isArray(node._value) && typeof node._value[1] === 'string') return node._value[1];
  if (typeof node.type === 'string') return node.type;
  return '-';
}

function flattenDeviceParameters(raw: Device['raw']) {
  const rows: DeviceParameter[] = [];
  if (!raw) return rows;

  function visit(node: unknown, path: string) {
    if (!isRecord(node)) return;

    if (('_value' in node || 'value' in node) && path) {
      rows.push({
        path,
        value: formatParameterValue(parameterValue(node)) || '-',
        type: parameterType(node),
        writable: typeof node._writable === 'boolean' ? (node._writable ? 'Yes' : 'No') : '-',
        updated: formatParameterValue(node._timestamp || node._lastUpdate) || '-'
      });
      return;
    }

    Object.entries(node).forEach(([key, value]) => {
      if (key.startsWith('_')) return;
      visit(value, path ? `${path}.${key}` : key);
    });
  }

  visit(raw, '');
  return rows.sort((left, right) => left.path.localeCompare(right.path));
}

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/devices', { params: filters });
    devices.value = data.devices;
  } catch {
    ElMessage.error('Unable to load devices');
  } finally {
    loading.value = false;
  }
}

async function openDevice(device: Device) {
  closeContextMenu();
  try {
    const { data } = await api.get(`/devices/${encodeURIComponent(device.id)}`);
    selected.value = data.device;
    activeDeviceTab.value = 'overview';
    parameterSearch.value = '';
    parameterPage.value = 1;
    drawerOpen.value = true;
  } catch (error) {
    const apiError = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
    ElMessage.error(apiError || 'Device detail is not available');
  }
}

async function runTask(device: Device, action: 'refresh' | 'reboot' | 'factoryReset') {
  if (action !== 'refresh') {
    await ElMessageBox.confirm(`Send ${action === 'reboot' ? 'reboot' : 'factory reset'} to ${device.serialNumber || device.id}?`, 'Confirm device task', {
      type: action === 'factoryReset' ? 'error' : 'warning',
      confirmButtonText: 'Send task'
    });
  }

  taskLoading.value = true;
  try {
    await api.post(`/devices/${encodeURIComponent(device.id)}/tasks`, { action, connectionRequest: true });
    ElMessage.success('Task queued');
    await load();
  } catch {
    ElMessage.error('Task was not accepted by the ACS');
  } finally {
    taskLoading.value = false;
  }
}

async function setParameter() {
  if (!selected.value) return;
  taskLoading.value = true;
  try {
    await api.post(`/devices/${encodeURIComponent(selected.value.id)}/tasks`, {
      action: 'setParameterValues',
      connectionRequest: true,
      ...parameterForm
    });
    parameterDialogOpen.value = false;
    parameterForm.parameterPath = '';
    parameterForm.parameterValue = '';
    ElMessage.success('Parameter task queued');
  } catch {
    ElMessage.error('Parameter task was rejected');
  } finally {
    taskLoading.value = false;
  }
}

function openParameterDialog() {
  Object.assign(parameterForm, {
    parameterPath: '',
    parameterValue: '',
    parameterType: 'xsd:string'
  });
  parameterDialog.captureSnapshot();
  parameterDialogOpen.value = true;
}

function closeContextMenu() {
  contextMenu.visible = false;
  contextMenu.device = null;
}

function openContextMenu(row: Device, _column: unknown, event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.device = row;
  contextMenu.visible = true;
}

function openDeviceFromContext() {
  const device = contextMenu.device;
  if (!device) return;
  void openDevice(device);
}

function refreshDeviceFromContext() {
  const device = contextMenu.device;
  if (!device) return;
  closeContextMenu();
  void runTask(device, 'refresh');
}

function rebootDeviceFromContext() {
  const device = contextMenu.device;
  if (!device) return;
  closeContextMenu();
  void runTask(device, 'reboot');
}

async function deleteDeviceFromContext() {
  const device = contextMenu.device;
  if (!device) return;

  try {
    await ElMessageBox.confirm(`Delete device ${device.serialNumber || device.id}?`, 'Confirm delete', {
      type: 'warning',
      confirmButtonText: 'Delete',
      confirmButtonClass: 'el-button--danger'
    });
  } catch {
    closeContextMenu();
    return;
  }

  try {
    await api.delete(`/devices/${encodeURIComponent(device.id)}`);
    ElMessage.success('Device deleted');
    if (selected.value?.id === device.id) {
      drawerOpen.value = false;
      selected.value = null;
    }
    await load();
  } catch (error) {
    const apiError = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
    ElMessage.error(apiError || 'Device delete failed');
  } finally {
    closeContextMenu();
  }
}

function onGlobalClick() {
  if (contextMenu.visible) {
    closeContextMenu();
  }
}

onMounted(load);
watch(parameterSearch, () => {
  parameterPage.value = 1;
});
watch(parameterPageSize, () => {
  parameterPage.value = 1;
});
onMounted(() => {
  window.addEventListener('click', onGlobalClick);
  window.addEventListener('contextmenu', onGlobalClick);
  window.addEventListener('scroll', onGlobalClick, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', onGlobalClick);
  window.removeEventListener('contextmenu', onGlobalClick);
  window.removeEventListener('scroll', onGlobalClick, true);
});
</script>

<template>
  <section class="toolbar">
    <div>
      <h2>Devices</h2>
      <p>{{ devices.length }} CPE records</p>
    </div>
    <div class="toolbar-actions">
      <el-input v-model="filters.search" :prefix-icon="Search" clearable placeholder="Search serial, vendor, model" @keyup.enter="load" />
      <el-select v-model="filters.status" style="width: 140px" @change="load">
        <el-option label="All" value="all" />
        <el-option label="Online" value="online" />
        <el-option label="Offline" value="offline" />
      </el-select>
      <TableColumnChooser v-model="visibleColumns" :columns="deviceColumns" @save="saveColumns" />
      <el-tooltip content="Refresh" placement="top">
        <el-button :icon="Refresh" circle :loading="loading" @click="load" />
      </el-tooltip>
    </div>
  </section>

  <section class="panel">
    <el-table :data="deviceRows" v-loading="loading" stripe row-key="id" @row-contextmenu="openContextMenu">
      <el-table-column v-if="isColumnVisible('status')" label="Status" width="110">
        <template #default="{ row }">
          <el-tag :type="row.online ? 'success' : 'info'">{{ row.online ? 'Online' : 'Offline' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="isColumnVisible('serialNumber')" prop="serialNumber" label="Serial" min-width="180" />
      <el-table-column v-if="isColumnVisible('manufacturer')" prop="manufacturer" label="Vendor" min-width="150" />
      <el-table-column v-if="isColumnVisible('productClass')" prop="productClass" label="Model" min-width="150" />
      <el-table-column v-if="isColumnVisible('softwareVersion')" prop="softwareVersion" label="Firmware" min-width="150" />
      <el-table-column v-if="isColumnVisible('firstAuthorizedAt')" label="First authorized" min-width="190">
        <template #default="{ row }">{{ row.firstAuthorizedAt ? new Date(row.firstAuthorizedAt).toLocaleString() : '-' }}</template>
      </el-table-column>
      <el-table-column v-if="isColumnVisible('lastInform')" label="Last inform" min-width="190">
        <template #default="{ row }">{{ row.lastInform ? new Date(row.lastInform).toLocaleString() : 'Never' }}</template>
      </el-table-column>
      <el-table-column v-if="isColumnVisible('actions')" label="Actions" width="190" fixed="right">
        <template #default="{ row }">
          <el-tooltip content="Details" placement="top">
            <el-button :icon="Edit" circle @click="openDevice(row)" />
          </el-tooltip>
          <el-tooltip content="Refresh object" placement="top">
            <el-button :icon="Refresh" circle :loading="taskLoading" @click="runTask(row, 'refresh')" />
          </el-tooltip>
          <el-tooltip content="Reboot" placement="top">
            <el-button :icon="SwitchButton" circle type="warning" plain @click="runTask(row, 'reboot')" />
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>
  </section>

  <teleport to="body">
    <div
      v-if="contextMenu.visible"
      class="device-context-menu"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @click.stop
    >
      <button type="button" class="device-context-item" @click="openDeviceFromContext">View details</button>
      <button type="button" class="device-context-item" @click="refreshDeviceFromContext">Refresh object</button>
      <button type="button" class="device-context-item" @click="rebootDeviceFromContext">Reboot</button>
      <button type="button" class="device-context-item danger" @click="deleteDeviceFromContext">Delete device</button>
    </div>
  </teleport>

  <el-drawer v-model="drawerOpen" size="64%" :title="selected?.serialNumber || selected?.id">
    <template v-if="selected">
      <div class="drawer-actions">
        <el-button type="primary" :icon="Setting" @click="openParameterDialog">Set Parameter</el-button>
        <el-button :icon="Refresh" @click="runTask(selected, 'refresh')">Refresh</el-button>
        <el-button type="warning" plain :icon="SwitchButton" @click="runTask(selected, 'reboot')">Reboot</el-button>
        <el-button type="danger" plain :icon="WarningFilled" @click="runTask(selected, 'factoryReset')">Factory Reset</el-button>
      </div>

      <el-tabs v-model="activeDeviceTab" class="device-detail-tabs">
        <el-tab-pane label="Overview" name="overview">
          <div class="detail-grid">
            <span>Manufacturer</span><strong>{{ selected.manufacturer || '-' }}</strong>
            <span>Model</span><strong>{{ selected.productClass || '-' }}</strong>
            <span>Firmware</span><strong>{{ selected.softwareVersion || '-' }}</strong>
            <span>IP address</span><strong>{{ selected.ipAddress || '-' }}</strong>
            <span>First authorized</span><strong>{{ selected.firstAuthorizedAt ? new Date(selected.firstAuthorizedAt).toLocaleString() : '-' }}</strong>
            <span>Last inform</span><strong>{{ selected.lastInform ? new Date(selected.lastInform).toLocaleString() : 'Never' }}</strong>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="`Parameters (${parameterRows.length})`" name="parameters">
          <div class="parameter-toolbar">
            <el-input v-model="parameterSearch" :prefix-icon="Search" clearable placeholder="Search path, value, type" />
            <span>{{ parameterPageStart }}-{{ parameterPageEnd }} of {{ filteredParameterRows.length }}</span>
          </div>
          <el-table :data="pagedParameterRows" border height="520" empty-text="No parameters found">
            <el-table-column prop="path" label="Parameter" min-width="320">
              <template #default="{ row }">
                <span class="parameter-cell" :title="row.path">{{ row.path }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="value" label="Current value" min-width="260">
              <template #default="{ row }">
                <span class="parameter-cell" :title="row.value">{{ row.value }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="type" label="Type" width="130" />
            <el-table-column prop="writable" label="Writable" width="95" />
            <el-table-column prop="updated" label="Updated" min-width="185">
              <template #default="{ row }">
                <span class="parameter-cell" :title="row.updated">{{ row.updated }}</span>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="parameterPage"
            v-model:page-size="parameterPageSize"
            class="parameter-pagination"
            layout="sizes, prev, pager, next"
            :page-sizes="[50, 100, 200]"
            :total="filteredParameterRows.length"
          />
        </el-tab-pane>

        <el-tab-pane label="Raw JSON" name="raw">
          <pre class="raw-json">{{ JSON.stringify(selected.raw, null, 2) }}</pre>
        </el-tab-pane>
      </el-tabs>
    </template>
  </el-drawer>

  <el-dialog v-model="parameterDialogOpen" :before-close="parameterDialog.beforeClose" title="Set Parameter" width="520px">
    <el-form label-position="top">
      <el-form-item label="Path">
        <el-input v-model="parameterForm.parameterPath" placeholder="Device.ManagementServer.PeriodicInformInterval" />
      </el-form-item>
      <el-form-item label="Value">
        <el-input v-model="parameterForm.parameterValue" />
      </el-form-item>
      <el-form-item label="Type">
        <el-select v-model="parameterForm.parameterType">
          <el-option label="String" value="xsd:string" />
          <el-option label="Boolean" value="xsd:boolean" />
          <el-option label="Integer" value="xsd:int" />
          <el-option label="Unsigned integer" value="xsd:unsignedInt" />
          <el-option label="Date time" value="xsd:dateTime" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="parameterDialog.requestClose">Cancel</el-button>
      <el-button type="primary" :loading="taskLoading" @click="setParameter">Queue Task</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.device-context-menu {
  position: fixed;
  z-index: 3000;
  min-width: 170px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  padding: 6px;
}

.device-context-item {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
}

.device-context-item:hover {
  background: #f5f7fa;
}

.device-context-item.danger {
  color: #c45656;
}

.device-detail-tabs {
  margin-top: 18px;
}

.parameter-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.parameter-toolbar .el-input {
  max-width: 420px;
}

.parameter-toolbar span {
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
}

.parameter-cell {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.parameter-pagination {
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
