import { HttpError } from './http.js';

export function routeParam(value: string | string[] | undefined, name = 'id') {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (!normalized) {
    throw new HttpError(400, `Missing route parameter: ${name}`);
  }

  return normalized;
}
