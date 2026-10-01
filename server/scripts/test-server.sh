#!/usr/bin/env bash
# Throwaway Strapi for the integration and e2e suites: a fresh SQLite DB (.tmp/test.db) with the sample seed, on
# port 1342, run with `strapi start` (production mode: MCP lists exactly the 8 MatFinder tools).
# It builds into dist/, which `npm run develop` also uses, so stop the dev server first.
#   scripts/test-server.sh start | stop | status
set -uo pipefail
cd "$(dirname "$0")/.."
PORT="${TEST_PORT:-1342}"
PIDF=.tmp/test-server.pgid
LOG=.tmp/test-server.log

stop() {
  if [ -f "$PIDF" ]; then
    kill -- "-$(cat "$PIDF")" 2>/dev/null
    sleep 2
    kill -9 -- "-$(cat "$PIDF")" 2>/dev/null
    rm -f "$PIDF"
  fi
}

case "${1:-start}" in
  start)
    stop
    mkdir -p .tmp
    rm -f .tmp/test.db .tmp/test.db-journal .tmp/test.db-wal .tmp/test.db-shm
    npm run build > .tmp/test-build.log 2>&1 || { echo "build failed:"; tail -30 .tmp/test-build.log; exit 1; }
    PORT="$PORT" DATABASE_CLIENT=sqlite DATABASE_FILENAME=.tmp/test.db \
    BETTER_AUTH_URL="http://localhost:$PORT" WEB_ORIGINS="http://localhost:8083,http://localhost:8084" \
    SEED_SAMPLE_DATA=true MCP_ENABLED=true MAPBOX_GEOCODING_TOKEN= \
      setsid bash -c 'echo $$ > "$0"; exec npm run start' "$PIDF" > "$LOG" 2>&1 < /dev/null &
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
