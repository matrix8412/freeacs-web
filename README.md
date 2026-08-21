# FreeACS Web

Modern TR-069 ACS management stack for routers and modems. The project is built to be cloned and started with Docker Compose:

```sh
cp .env.example .env
./scripts/generate-secrets.sh
docker compose up --build
```

The web interface is available at `http://localhost:8080`.

## Architecture

The stack contains four services:

- `acs`: MongoDB-backed open-source TR-069 ACS engine.
- `mongodb`: authenticated MongoDB storage.
- `backend`: secure API for users, groups, settings, device actions, and ACS integration.
- `frontend`: Vue + Vue Router + Element Plus web interface served by Nginx.

Important compatibility note: the upstream `freeacs/freeacs` project currently requires MySQL, while this requested stack requires MongoDB. This scaffold therefore uses GenieACS as the MongoDB-backed open-source ACS engine and keeps the service named `acs`. If the exact `freeacs/freeacs` codebase is mandatory, MongoDB cannot be the ACS database without a substantial port.

## Ports

- `8080`: frontend UI.
- `8081`: backend API bound to localhost for diagnostics.
- `7547`: CWMP endpoint for CPE devices.
- `7557`: GenieACS NBI is internal only.
- `7567`: GenieACS file server is internal only.

Set `ACS_CWMP_PUBLIC_URL` in `.env` to the URL your devices can reach, for example `https://acs.example.net:7547`.

## Security Defaults

- MongoDB authentication is enabled.
- Backend uses HTTP-only JWT cookies, SameSite strict cookies, CSRF protection for state-changing API calls, password hashing, Helmet headers, input validation, rate limiting, and audit logging.
- The ACS northbound API is not exposed publicly.
- Containers run as non-root where practical.
- Frontend Nginx sends security headers and proxies API traffic server-side.

Before production, replace every secret in `.env`, terminate TLS at a reverse proxy or load balancer, restrict access to ports `8080` and `7547`, and back up the `mongodb-data` volume.

## Default Login

The backend creates the initial admin user on first boot from:

- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_PASSWORD`

Change these values before the first start.

## Main Screens

- Dashboard: fleet health, ACS status, online/offline counts.
- Devices: searchable CPE inventory, detail drawer, refresh/reboot/factory reset/set parameter tasks.
- Settings:
  - General ACS/application settings.
  - Users.
  - User groups and permissions.

## Development checks

Run backend API tests and type checking with `npm test` and `npm run typecheck` from `backend/`. Run the frontend checks with `npm run check` from `frontend/`.

The device inventory API is paginated using `page` and `pageSize` query parameters. Responses include `pagination.hasNextPage`; the frontend uses this metadata to request only the visible page.

Devices support ACS-backed tags. Add or remove them in the device detail panel, or use `POST`/`DELETE /api/devices/:id/tags/:tag`. Provision scripts can branch on tags:

```js
const premium = declare('Tags.premium', { value: 1 }).value[0];
if (premium) {
  declare('Device.DeviceInfo.PeriodicInformInterval', null, { value: 300 });
}
```

Use `if (!declare('Tags.premium', { value: 1 }).value[0])` for devices without a tag. GenieACS stores a tag as a boolean special parameter under `Tags.*`.

## References

- FreeACS upstream currently documents Java/MySQL prerequisites: https://github.com/freeacs/freeacs
- GenieACS documents MongoDB-backed ACS services and NBI API: https://docs.genieacs.com/en/stable/
- Docker Compose describes multi-container applications: https://docs.docker.com/compose/
