#!/usr/bin/env sh
set -eu

: "${GENIEACS_MONGODB_CONNECTION_URL:?GENIEACS_MONGODB_CONNECTION_URL is required}"
: "${GENIEACS_UI_JWT_SECRET:?GENIEACS_UI_JWT_SECRET is required}"

pids=""

start_service() {
  "$@" &
  pids="$pids $!"
}

stop_services() {
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null || true
    wait $pids 2>/dev/null || true
  fi
}

trap stop_services INT TERM

start_service genieacs-cwmp
start_service genieacs-nbi
start_service genieacs-fs
start_service genieacs-ui

wait $pids

