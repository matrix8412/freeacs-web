import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/LoginView.vue';
import AppShell from '../components/AppShell.vue';
import DashboardView from '../views/DashboardView.vue';
import DevicesView from '../views/DevicesView.vue';
import SettingsLayout from '../views/settings/SettingsLayout.vue';
import GeneralSettings from '../views/settings/GeneralSettings.vue';
import UsersSettings from '../views/settings/UsersSettings.vue';
import GroupsSettings from '../views/settings/GroupsSettings.vue';
import PresetsSettings from '../views/settings/PresetsSettings.vue';
import ProvisionsSettings from '../views/settings/ProvisionsSettings.vue';
import DeviceTypesSettings from '../views/settings/DeviceTypesSettings.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView },
    {
      path: '/',
      component: AppShell,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', component: DashboardView },
        { path: 'devices', component: DevicesView },
        {
          path: 'settings',
          component: SettingsLayout,
          redirect: '/settings/general',
          children: [
            { path: 'general', component: GeneralSettings },
            { path: 'device-types', component: DeviceTypesSettings },
            { path: 'presets', component: PresetsSettings },
            { path: 'provisions', component: ProvisionsSettings },
            { path: 'users', component: UsersSettings },
            { path: 'groups', component: GroupsSettings }
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
