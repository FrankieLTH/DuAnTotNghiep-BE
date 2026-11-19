#!/bin/sh
set -eu

cd /app/backend

node -r ts-node/register -r tsconfig-paths/register scripts/setup-duanmoi.ts
for migration in customer-management room-variants room-content room-amenities room-parents; do
    node "src/migrations/$migration.cjs"
done

exec "$@"
