import { natsClient } from '@careforall/events';
import { db, pledges, outbox } from '@careforall/db';
import { eq } from 'drizzle-orm';
import { logger, canTransition, mapPaymentStatusToPledge, eventProcessingDuration, eventsConsumed } from '@careforall/common';

export async function startConsumers() {
  await natsClient.connect([process.env.NATS_URL || 'nats://localhost:4222']);
  
  logger.info('Pledge consumers started');

  natsClient.subscribe('payment.update', async (data: any) => {
    const start = Date.now();
    const { pledgeId, status } = data;
    logger.info(`Received payment.update for pledge ${pledgeId}: ${status}`);

    try {
      await db.transaction(async (tx) => {
        // 1. Get current pledge
        const [pledge] = await tx.select().from(pledges).where(eq(pledges.id, pledgeId));
        
        if (!pledge) {
          logger.error(`Pledge not found: ${pledgeId}`);
          eventsConsumed.inc({ event_type: 'payment.update', status: 'error' });
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
          eventsConsumed.inc({ event_type: 'payment.update', status: 'ignored' });
          return;
        }

        // Skip if already at this status (idempotent)
        if (currentStatus === newStatus) {
          logger.info(`Pledge ${pledgeId} already at status ${newStatus}`);
          eventsConsumed.inc({ event_type: 'payment.update', status: 'skipped' });
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
        
        // 5. Outbox Pattern: Publish event
        await tx.insert(outbox).values({
          eventType: 'pledge.updated',
          payload: updatedPledge,
        });
      });

      const duration = (Date.now() - start) / 1000;
      eventProcessingDuration.observe({ event_type: 'payment.update', status: 'success' }, duration);
      eventsConsumed.inc({ event_type: 'payment.update', status: 'success' });

    } catch (error) {
      logger.error('Error processing payment.update', error);
      const duration = (Date.now() - start) / 1000;
      eventProcessingDuration.observe({ event_type: 'payment.update', status: 'error' }, duration);
      eventsConsumed.inc({ event_type: 'payment.update', status: 'error' });
    }
  });
}
