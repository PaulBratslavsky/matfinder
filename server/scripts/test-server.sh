#!/usr/bin/env bash
# Throwaway Strapi for the integration and e2e suites: a fresh SQLite DB (.tmp/test.db) with the sample seed, on
# port 1342, run with `strapi start` (production mode: MCP lists exactly the 10 MatFinder tools).
# It builds into dist/, which `npm run develop` also uses, so stop the dev server first.
#   scripts/test-server.sh start | stop | status
set -uo pipefail
cd "$(dirname "$0")/.."
PORT="${TEST_PORT:-1342}"
PIDF=.tmp/test-server.pgid
LOG=.tmp/test-server.log

# Only kill the process group in the pgid file if it's still this test server (after a crash or reboot the number
# can belong to something else, like the dev `strapi develop`).
ours() { ps -o pgid=,args= -A 2>/dev/null | awk -v g="$1" '$1 == g' | grep -q "strapi start"; }

stop() {
  if [ -f "$PIDF" ]; then
    local pg; pg="$(cat "$PIDF")"
    if ours "$pg"; then
      kill -- "-$pg" 2>/dev/null
      sleep 2
      kill -9 -- "-$pg" 2>/dev/null
    fi
    rm -f "$PIDF"
  fi
}

# Run in a new process group, so stop() can end npm, Strapi and its workers together. macOS has no setsid.
launch() {
  if command -v setsid >/dev/null; then setsid bash -c 'echo $$ > "$0"; exec npm run start' "$PIDF"
  else perl -e 'setpgrp(0, 0); open(my $f, ">", shift) or die; print $f "$$\n"; close $f; exec @ARGV' "$PIDF" npm run start
  fi
}

case "${1:-start}" in
  start)
    stop
    if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/_health")" = "204" ]; then
      echo "port $PORT is already serving a Strapi that isn't this test server; stop it first"; exit 1
    fi
    mkdir -p .tmp
    rm -f .tmp/test.db .tmp/test.db-journal .tmp/test.db-wal .tmp/test.db-shm
    npm run build > .tmp/test-build.log 2>&1 || { echo "build failed:"; tail -30 .tmp/test-build.log; exit 1; }
    # Throwaway secrets, so a clean clone without server/.env can run the suites (env vars beat .env).
    PORT="$PORT" DATABASE_CLIENT=sqlite DATABASE_FILENAME=.tmp/test.db \
    APP_KEYS=test-key-1,test-key-2 API_TOKEN_SALT=test-salt ADMIN_JWT_SECRET=test-admin-secret \
    TRANSFER_TOKEN_SALT=test-transfer-salt JWT_SECRET=test-jwt-secret ENCRYPTION_KEY=test-encryption-key \
    BETTER_AUTH_SECRET=test-better-auth-secret-0123456789 BETTER_AUTH_DASHBOARD_SECRET=test-dashboard-secret \
    BETTER_AUTH_URL="http://localhost:$PORT" WEB_ORIGINS="http://localhost:8083,http://localhost:8084" \
    SEED_SAMPLE_DATA=true MCP_ENABLED=true MAPBOX_GEOCODING_TOKEN= \
      launch > "$LOG" 2>&1 < /dev/null &
    for _ in $(seq 1 120); do
      if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/_health")" = "204" ]; then
        echo "test server up on :$PORT"; exit 0
      fi
      if [ -f "$PIDF" ] && ! kill -0 "$(cat "$PIDF")" 2>/dev/null; then echo "test server died:"; tail -30 "$LOG"; exit 1; fi
      sleep 2
    done
    echo "test server timed out:"; tail -30 "$LOG"; exit 1
    ;;
  stop) stop; echo "test server stopped"; exit 0 ;;
  status) [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null && echo running || echo stopped; exit 0 ;;
  *) echo "usage: $0 start|stop|status"; exit 2 ;;
esac
