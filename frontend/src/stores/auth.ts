import { defineStore } from 'pinia';
import { api } from '../api/client';
import type { User } from '../types';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    ready: false
  }),
  actions: {
    async loadMe() {
      try {
        const { data } = await api.get('/auth/me');
        this.user = data.user;
      } catch {
        this.user = null;
      } finally {
        this.ready = true;
      }
    },
    async login(email: string, password: string) {
      const { data } = await api.post('/auth/login', { email, password });
      this.user = data.user;
      this.ready = true;
    },
    async logout() {
      try {
        await api.post('/auth/logout');
      } finally {
        this.user = null;
        this.ready = true;
      }
    },
    can(permission: string) {
      return Boolean(this.user?.permissions.includes('admin:*') || this.user?.permissions.includes(permission));
    }
  }
});

