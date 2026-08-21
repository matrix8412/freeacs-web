<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { CircleCheckFilled, Monitor, Refresh, TrendCharts, WarningFilled } from '@element-plus/icons-vue';
import { api } from '../api/client';
import { showApiError } from '../api/errors';
import TableColumnChooser from '../components/TableColumnChooser.vue';
import { useTableColumns } from '../composables/useTableColumns';
import type { Device } from '../types';

const loading = ref(false);
const summary = ref({
  acs: { ok: false, cwmpPublicUrl: '' },
  totals: { devices: 0, online: 0, offline: 0, vendors: 0 },
  recent: [] as Device[]
});
const recentDeviceColumns = [
  { id: 'status', label: 'Status' },
  { id: 'serialNumber', label: 'Serial' },
  { id: 'manufacturer', label: 'Vendor' },
  { id: 'productClass', label: 'Model' },
  { id: 'firstAuthorizedAt', label: 'First authorized' },
  { id: 'lastInform', label: 'Last inform' }
];
const { isColumnVisible, saveColumns, visibleColumns } = useTableColumns('dashboard.recent-devices', recentDeviceColumns);

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/dashboard/summary');
    summary.value = data;
  } catch (error) {
    showApiError(error, 'Dashboard data is not available');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="toolbar">
    <div>
      <h2>Fleet Overview</h2>
      <p>{{ summary.acs.cwmpPublicUrl }}</p>
    </div>
    <div class="toolbar-actions">
      <TableColumnChooser v-model="visibleColumns" :columns="recentDeviceColumns" @save="saveColumns" />
      <el-tooltip content="Refresh" placement="left">
        <el-button :icon="Refresh" circle :loading="loading" @click="load" />
      </el-tooltip>
    </div>
  </section>

  <section class="metric-grid">
    <article class="metric-card">
      <el-icon><Monitor /></el-icon>
      <span>Total devices</span>
      <strong>{{ summary.totals.devices }}</strong>
    </article>
    <article class="metric-card is-good">
      <el-icon><CircleCheckFilled /></el-icon>
      <span>Online</span>
      <strong>{{ summary.totals.online }}</strong>
    </article>
    <article class="metric-card is-warn">
      <el-icon><WarningFilled /></el-icon>
      <span>Offline</span>
      <strong>{{ summary.totals.offline }}</strong>
    </article>
    <article class="metric-card">
      <el-icon><TrendCharts /></el-icon>
      <span>Vendors</span>
      <strong>{{ summary.totals.vendors }}</strong>
    </article>
  </section>

  <section class="panel">
    <header class="panel-header">
      <h2>Recent Inform Sessions</h2>
      <el-tag :type="summary.acs.ok ? 'success' : 'danger'">{{ summary.acs.ok ? 'ACS online' : 'ACS unavailable' }}</el-tag>
    </header>

    <el-table :data="summary.recent" v-loading="loading" stripe>
      <el-table-column v-if="isColumnVisible('status')" label="Status" width="110">
        <template #default="{ row }">
          <el-tag :type="row.online ? 'success' : 'info'">{{ row.online ? 'Online' : 'Offline' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="isColumnVisible('serialNumber')" prop="serialNumber" label="Serial" min-width="180" />
      <el-table-column v-if="isColumnVisible('manufacturer')" prop="manufacturer" label="Vendor" min-width="150" />
      <el-table-column v-if="isColumnVisible('productClass')" prop="productClass" label="Model" min-width="150" />
      <el-table-column v-if="isColumnVisible('firstAuthorizedAt')" label="First authorized" min-width="190">
        <template #default="{ row }">{{ row.firstAuthorizedAt ? new Date(row.firstAuthorizedAt).toLocaleString() : '-' }}</template>
      </el-table-column>
      <el-table-column v-if="isColumnVisible('lastInform')" label="Last inform" min-width="190">
        <template #default="{ row }">{{ row.lastInform ? new Date(row.lastInform).toLocaleString() : 'Never' }}</template>
      </el-table-column>
    </el-table>
  </section>
</template>
