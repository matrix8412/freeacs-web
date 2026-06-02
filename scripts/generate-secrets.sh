#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
  cp .env.example .env
fi

secret() {
  openssl rand -hex 48
}

tmp_file="$(mktemp)"
awk -v mongo="$(secret)" -v jwt="$(secret)" -v genie="$(secret)" -v admin="Admin-$(secret)" '
  /^MONGO_INITDB_ROOT_PASSWORD=/ { print "MONGO_INITDB_ROOT_PASSWORD=" mongo; next }
  /^JWT_SECRET=/ { print "JWT_SECRET=" jwt; next }
  /^GENIEACS_UI_JWT_SECRET=/ { print "GENIEACS_UI_JWT_SECRET=" genie; next }
  /^INITIAL_ADMIN_PASSWORD=/ { print "INITIAL_ADMIN_PASSWORD=" admin; next }
  { print }
' .env > "$tmp_file"
mv "$tmp_file" .env
chmod 600 .env

echo "Updated .env with fresh secrets. Review INITIAL_ADMIN_EMAIL before first boot."
