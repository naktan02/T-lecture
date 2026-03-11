# ── 빌드 스테이지 ──────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# 의존성 먼저 복사 (레이어 캐시 활용)
COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

# Prisma 클라이언트 생성
RUN npx prisma generate

# 소스 복사 후 TypeScript 빌드
COPY src ./src
COPY tsconfig.json ./

RUN npm run build

# report 에셋 복사 (xcopy 대신 cp 사용)
RUN cp -r src/infra/report dist/infra/report 2>/dev/null || true


# ── 실행 스테이지 ──────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# 프로덕션 의존성만 설치
COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --omit=dev

# Prisma 클라이언트 생성 (런타임에 필요)
RUN npx prisma generate

# 빌드 결과물 복사
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]
