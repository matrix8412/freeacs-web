<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { api } from '../../api/client';

const loading = ref(false);
const saving = ref(false);
const form = reactive({
  acsPublicUrl: '',
  informIntervalSeconds: 3600,
  requireCpeAuthentication: true,
  registrationMode: 'manual-approval',
  sessionTimeoutSeconds: 28800
});

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/settings/general');
    Object.assign(form, data.settings);
  } catch {
    ElMessage.error('Unable to load settings');
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    const { data } = await api.put('/settings/general', form);
    Object.assign(form, data.settings);
    ElMessage.success('Settings saved');
  } catch {
    ElMessage.error('Unable to save settings');
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="panel narrow-panel" v-loading="loading">
    <el-form label-position="top">
      <el-form-item label="ACS public URL">
        <el-input v-model="form.acsPublicUrl" />
      </el-form-item>
      <el-form-item label="Inform interval">
        <el-input-number v-model="form.informIntervalSeconds" :min="60" :max="604800" :step="60" />
      </el-form-item>
      <el-form-item label="CPE authentication">
        <el-switch v-model="form.requireCpeAuthentication" active-text="Required" inactive-text="Disabled" />
      </el-form-item>
      <el-form-item label="Registration mode">
        <el-segmented
          v-model="form.registrationMode"
          :options="[
            { label: 'Manual approval', value: 'manual-approval' },
            { label: 'Auto register', value: 'auto-register' }
          ]"
        />
      </el-form-item>
      <el-form-item label="Session timeout">
        <el-input-number v-model="form.sessionTimeoutSeconds" :min="900" :max="86400" :step="300" />
      </el-form-item>
      <el-button type="primary" :loading="saving" @click="save">Save Settings</el-button>
    </el-form>
  </section>
</template>

