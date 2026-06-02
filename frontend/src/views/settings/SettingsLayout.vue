<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const active = computed(() => route.path);

function changeTab(name: string | number) {
  router.push(String(name));
}
</script>

<template>
  <section class="settings-page">
    <el-tabs :model-value="active" @tab-change="changeTab">
      <el-tab-pane label="General" name="/settings/general" />
      <el-tab-pane label="Presets" name="/settings/presets" />
      <el-tab-pane label="Provisions" name="/settings/provisions" />
      <el-tab-pane label="Users" name="/settings/users" />
      <el-tab-pane label="User groups" name="/settings/groups" />
    </el-tabs>
    <router-view />
  </section>
</template>
