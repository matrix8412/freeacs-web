<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Lock, User } from '@element-plus/icons-vue';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const loading = ref(false);
const form = reactive({
  email: '',
  password: ''
});

async function submit() {
  loading.value = true;
  try {
    await auth.login(form.email, form.password);
    await router.push('/dashboard');
  } catch {
    ElMessage.error('Invalid email or password');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="login-screen">
    <section class="login-panel">
      <div class="login-brand">
        <span class="brand-mark">ACS</span>
        <div>
          <h1>FreeACS Web</h1>
          <p>TR-069 device management</p>
        </div>
      </div>

      <el-form class="login-form" @submit.prevent="submit">
        <el-form-item>
          <el-input v-model="form.email" :prefix-icon="User" size="large" type="email" autocomplete="username" placeholder="Email" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" :prefix-icon="Lock" size="large" type="password" autocomplete="current-password" placeholder="Password" show-password />
        </el-form-item>
        <el-button type="primary" size="large" :loading="loading" native-type="submit" class="full-button">Login</el-button>
      </el-form>
    </section>
  </main>
</template>

