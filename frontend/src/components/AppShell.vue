<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import { Connection, HomeFilled, Monitor, Setting, SwitchButton } from '@element-plus/icons-vue';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const activePath = computed(() => route.path);

async function logout() {
  await ElMessageBox.confirm('Sign out of the management console?', 'Logout', {
    type: 'warning',
    confirmButtonText: 'Logout'
  });
  await auth.logout();
  await router.push('/login');
}
</script>

<template>
  <el-container class="shell">
    <el-aside class="sidebar" width="248px">
      <div class="brand">
        <el-icon><Connection /></el-icon>
        <span>FreeACS Web</span>
      </div>

      <el-menu :default-active="activePath" router class="nav">
        <el-menu-item index="/dashboard">
          <el-icon><HomeFilled /></el-icon>
          <span>Dashboard</span>
        </el-menu-item>
        <el-menu-item index="/devices">
          <el-icon><Monitor /></el-icon>
          <span>Devices</span>
        </el-menu-item>
        <el-menu-item index="/settings/general">
          <el-icon><Setting /></el-icon>
          <span>Settings</span>
        </el-menu-item>
      </el-menu>

      <div class="account">
        <div>
          <strong>{{ auth.user?.name }}</strong>
          <span>{{ auth.user?.email }}</span>
        </div>
        <el-tooltip content="Logout" placement="top">
          <el-button :icon="SwitchButton" circle @click="logout" />
        </el-tooltip>
      </div>
    </el-aside>

    <el-container>
      <el-header class="topbar">
        <div>
          <p class="eyebrow">ACS CPE Management</p>
          <h1>{{ String(route.name || route.path.split('/').filter(Boolean).at(-1) || 'Dashboard') }}</h1>
        </div>
      </el-header>

      <el-main class="content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

