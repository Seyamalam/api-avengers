import { natsClient } from '@careforall/events';
import { db, campaigns } from '@careforall/db';
import { eq, sql } from 'drizzle-orm';
import { logger, donationAmount, campaignCurrentAmount } from '@careforall/common';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function startConsumers() {
  await natsClient.connect([process.env.NATS_URL || 'nats://localhost:4222']);
  
  logger.info('Campaign consumers started');

  // Listen for pledge updates to update campaign totals
  natsClient.subscribe('pledge.updated', async (data: any) => {
    const pledge = data;
    logger.info(`Received pledge.updated for campaign ${pledge.campaignId}: ${pledge.status}`);

    try {
      // Only update campaign total when pledge is CAPTURED
      if (pledge.status === 'CAPTURED') {
        let newAmount = 0;
        await db.transaction(async (tx) => {
          // Increment campaign currentAmount
          const [updatedCampaign] = await tx
            .update(campaigns)
            .set({
              currentAmount: sql`${campaigns.currentAmount} + ${pledge.amount}`,
              updatedAt: new Date(),
            })
            .where(eq(campaigns.id, pledge.campaignId))
            .returning();

          newAmount = updatedCampaign.currentAmount;
          logger.info(`Updated campaign ${pledge.campaignId} total by +${pledge.amount}`);
        });

        // Update metrics
        donationAmount.inc(pledge.amount);
        campaignCurrentAmount.set({ campaign_id: pledge.campaignId.toString() }, newAmount);

        // Invalidate cache for this campaign
        await redis.del(`campaign:${pledge.campaignId}`);
        // Invalidate listing cache too
        const keys = await redis.keys('campaigns:list:*');
        if (keys.length > 0) {
          await redis.del(...keys);
        }
        
        logger.info(`Invalidated cache for campaign ${pledge.campaignId}`);
      }
    } catch (error) {
      logger.error(`Error processing pledge.updated for campaign ${pledge.campaignId}`, error);
    }
  });
}
