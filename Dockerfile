# Next.js standalone build (App Router). The legacy SPA is served by the same server
# through src/app/[[...slug]], so one image still serves every Coact URL.
FROM node:22-alpine AS build
LABEL org.opencontainers.image.source=https://github.com/slaclab/coactui
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* values are inlined at build time; pass them as build args until the
# runtime config (MIGRATION-PLAN.md §5, M0) replaces them.
ARG NEXT_PUBLIC_COACT_GRAPHQL_URI
ARG NEXT_PUBLIC_LOGOUT_URL
ARG NEXT_PUBLIC_SLAC_MFA_SSH_KEYS_SERVER
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S coact && adduser -S coact -G coact
COPY --from=build --chown=coact:coact /app/.next/standalone ./
COPY --from=build --chown=coact:coact /app/.next/static ./.next/static
COPY --from=build --chown=coact:coact /app/public ./public
USER coact
# Port 3000 is unchanged, so the coact-deploy Service and Ingress stay as they are.
# coact-deploy must drop its `command: ["npm","start",...]` override (plan §1.7).
EXPOSE 3000
CMD ["node", "server.js"]
