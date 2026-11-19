FROM node:22-bookworm-slim
WORKDIR /app/backend
COPY project/backend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY project/backend/ ./
COPY project/shared/ /app/shared/
COPY docker/backend-entrypoint.sh /usr/local/bin/duanmoi-backend-entrypoint
EXPOSE 3000
ENTRYPOINT ["sh", "/usr/local/bin/duanmoi-backend-entrypoint"]
CMD ["node", "-r", "ts-node/register", "-r", "tsconfig-paths/register", "src/main.ts"]
