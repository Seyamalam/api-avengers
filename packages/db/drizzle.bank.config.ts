import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/bank-schema.ts',
  out: './drizzle/bank',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://user:password@localhost:5433/bank',
  },
});
