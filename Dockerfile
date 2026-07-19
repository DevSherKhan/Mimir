FROM node:20.20.2-bookworm-slim AS build
ENV SCARF_ANALYTICS=false
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20.20.2-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV SCARF_ANALYTICS=false
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-dashboard ./dist-dashboard
COPY --from=build /app/cloud/migrations ./cloud/migrations
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"
CMD ["node", "dist/server/index.js"]
