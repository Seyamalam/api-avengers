import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, campaigns } from '@careforall/db';
import { eq } from 'drizzle-orm';
import { natsClient } from '@careforall/events';
import { campaignsTotal } from '@careforall/common';
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

  // Update metrics
  campaignsTotal.inc();

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

const updateCampaignSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  goalAmount: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

app.put(
  '/:id',
  zValidator('json', updateCampaignSchema),
  async (c) => {
    const id = parseInt(c.req.param('id'));
    const data = c.req.valid('json');

    const [updated] = await db.update(campaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: 'Campaign not found' }, 404);
    }

    // Invalidate cache
    await redis.del(`campaign:${id}`);
    // We might want to invalidate the list cache too, but it's short lived (5 mins)
    // For now let's just invalidate the specific item

    return c.json(updated);
  }
);

app.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  const [updated] = await db.update(campaigns)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'Campaign not found' }, 404);
  }

  // Invalidate cache
  await redis.del(`campaign:${id}`);

  return c.json({ success: true, message: 'Campaign deactivated' });
});

export const campaignRoutes = app;
