import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, campaigns } from '@careforall/db';
import { eq } from 'drizzle-orm';
import { natsClient } from '@careforall/events';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const app = new Hono();

const createCampaignSchema = z.object({
  title: z.string(),
  description: z.string(),
  goalAmount: z.number().positive(),
});

app.post(
  '/',
  zValidator('json', createCampaignSchema),
  async (c) => {
    const data = c.req.valid('json');
  
    const [campaign] = await db.insert(campaigns).values(data).returning();

  if (!campaign) {
    return c.json({ error: 'Failed to create campaign' }, 500);
  }

  // Publish event
  await natsClient.publish('campaign.created', campaign);

  // Cache immediately
  await redis.set(`campaign:${campaign.id}`, JSON.stringify(campaign), 'EX', 3600);

  return c.json(campaign, 201);
});

app.get('/', async (c) => {
  // List all active campaigns
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');
  const offset = (page - 1) * limit;

  // Try cache for listing
  const cacheKey = `campaigns:list:${page}:${limit}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return c.json(JSON.parse(cached));
  }

  const allCampaigns = await db.query.campaigns.findMany({
    where: eq(campaigns.isActive, true),
    limit,
    offset,
    orderBy: (campaigns, { desc }) => [desc(campaigns.createdAt)],
  });

  const result = { campaigns: allCampaigns, page, limit };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300); // 5 min cache

  return c.json(result);
});

app.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  
  // Try cache
  const cached = await redis.get(`campaign:${id}`);
  if (cached) {
    return c.json(JSON.parse(cached));
  }

  // Fallback to DB
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });

  if (!campaign) {
    return c.json({ error: 'Campaign not found' }, 404);
  }

  // Update cache
  await redis.set(`campaign:${id}`, JSON.stringify(campaign), 'EX', 3600);

  return c.json(campaign);
});

export const campaignRoutes = app;
