FROM node:22-bookworm-slim
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY backend/ ./
COPY shared/ /app/shared/
EXPOSE 3000
CMD ["sh", "-c", "npx ts-node -r tsconfig-paths/register scripts/setup-duanmoi.ts && node src/migrations/customer-management.cjs && node src/migrations/room-variants.cjs && node src/migrations/room-content.cjs && node src/migrations/room-amenities.cjs && node src/migrations/room-parents.cjs && exec npx ts-node -r tsconfig-paths/register src/main.ts"]
