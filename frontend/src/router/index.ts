import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AppShell from '../components/AppShell.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../views/LoginView.vue') },
    {
      path: '/',
      component: AppShell,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', component: () => import('../views/DashboardView.vue') },
        { path: 'devices', component: () => import('../views/DevicesView.vue') },
        {
          path: 'settings',
          component: () => import('../views/settings/SettingsLayout.vue'),
          redirect: '/settings/general',
          children: [
            { path: 'general', component: () => import('../views/settings/GeneralSettings.vue') },
            { path: 'device-types', component: () => import('../views/settings/DeviceTypesSettings.vue') },
            { path: 'presets', component: () => import('../views/settings/PresetsSettings.vue') },
            { path: 'provisions', component: () => import('../views/settings/ProvisionsSettings.vue') },
            { path: 'users', component: () => import('../views/settings/UsersSettings.vue') },
            { path: 'groups', component: () => import('../views/settings/GroupsSettings.vue') }
          ]
        }
      ]
    }
  ]
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.ready) {
    await auth.loadMe();
  }

  if (to.meta.requiresAuth && !auth.user) {
    return '/login';
  }

  if (to.path === '/login' && auth.user) {
    return '/dashboard';
  }

  return true;
});
