import { natsClient } from '@careforall/events';
import { db, pledges, outbox } from '@careforall/db';
import { eq } from 'drizzle-orm';
import { logger, canTransition, mapPaymentStatusToPledge } from '@careforall/common';

export async function startConsumers() {
  await natsClient.connect([process.env.NATS_URL || 'nats://localhost:4222']);
  
  logger.info('Pledge consumers started');

  natsClient.subscribe('payment.update', async (data: any) => {
    const { pledgeId, status } = data;
    logger.info(`Received payment.update for pledge ${pledgeId}: ${status}`);

    try {
      await db.transaction(async (tx) => {
        // 1. Get current pledge
        const [pledge] = await tx.select().from(pledges).where(eq(pledges.id, pledgeId));
        
        if (!pledge) {
          logger.error(`Pledge not found: ${pledgeId}`);
          return;
        }

        // 2. Map payment status to pledge status
        const newStatus = mapPaymentStatusToPledge(status);
        
        // 3. State Machine Validation
        const currentStatus = pledge.status || 'PENDING';
        if (!canTransition(currentStatus, newStatus)) {
          logger.warn(
            `Invalid state transition for pledge ${pledgeId}: ${currentStatus} -> ${newStatus}. Ignoring.`
          );
          return;
        }

        // Skip if already at this status (idempotent)
        if (currentStatus === newStatus) {
          logger.info(`Pledge ${pledgeId} already at status ${newStatus}`);
          return;
        }

        // 4. Update Pledge
        const [updatedPledge] = await tx.update(pledges)
          .set({ 
            status: newStatus, 
            updatedAt: new Date() 
          })
          .where(eq(pledges.id, pledgeId))
          .returning();

        // 4. Write to Outbox
        await tx.insert(outbox).values({
          aggregateType: 'pledge',
          aggregateId: pledge.id.toString(),
          eventType: 'pledge.updated',
          payload: updatedPledge,
        });
        
        logger.info(`Updated pledge ${pledgeId} to ${newStatus} and queued event`);
      });
    } catch (error) {
      logger.error(`Error processing payment.update for pledge ${pledgeId}`, error);
    }
  });
}
