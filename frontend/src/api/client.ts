import axios from 'axios';

function readCookie(name: string) {
  const value = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');

  return value ? decodeURIComponent(value) : undefined;
}

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = readCookie('csrf_token');
    if (csrf) {
      config.headers = config.headers || {};
      (config.headers as any)['X-CSRF-Token'] = csrf;
    }
  }

  return config;
});

