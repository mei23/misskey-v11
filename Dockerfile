FROM node:18.17.1-bullseye AS builder

ENV NODE_ENV=production
WORKDIR /misskey

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential

COPY package.json pnpm-lock.yaml ./

RUN corepack enable pnpm

RUN pnpm i --frozen-lockfile

COPY . ./
RUN pnpm build


FROM node:18.17.1-bullseye-slim AS runner

WORKDIR /misskey

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg tini \
 && apt-get -y clean \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable pnpm

COPY --from=builder /misskey/node_modules ./node_modules
COPY --from=builder /misskey/built ./built
COPY . ./

ENV NODE_ENV=production
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["pnpm", "migrateandstart"]
