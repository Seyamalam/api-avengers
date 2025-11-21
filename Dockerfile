FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock* tsconfig.json ./
COPY packages ./packages
COPY apps ./apps

RUN bun install --no-save

# We will override the command in docker-compose
CMD ["bun", "run", "dev"]
