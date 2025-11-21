import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db, pledges, outbox } from '@careforall/db';
import { pledgesTotal } from '@careforall/common';

const app = new Hono();

const createPledgeSchema = z.object({
  campaignId: z.number(),
  userId: z.number().optional(),
  amount: z.number().positive(),
});

app.post('/', zValidator('json', createPledgeSchema), async (c) => {
  const data = c.req.valid('json');
  
  try {
    const result = await db.transaction(async (tx) => {
      // 1. Create Pledge
      const [pledge] = await tx.insert(pledges).values({
        ...data,
        status: 'PENDING',
      }).returning();

      // 2. Insert into Outbox
      await tx.insert(outbox).values({
        aggregateType: 'pledge',
        aggregateId: pledge.id.toString(),
        eventType: 'pledge.created',
        payload: pledge,
      });

      return pledge;
    });

    // Update metrics
    pledgesTotal.inc({ status: 'created' });

    return c.json(result, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to create pledge' }, 500);
  }
});

export const pledgeRoutes = app;
