import { db, outbox } from '@careforall/db';
import { eq, isNull, sql } from 'drizzle-orm';
import { natsClient } from '@careforall/events';
import { logger } from '@careforall/common';

async function processOutbox() {
  await natsClient.connect([process.env.NATS_URL || 'nats://localhost:4222']);
  logger.info('Outbox worker started');

  while (true) {
    try {
      await db.transaction(async (tx) => {
        // 1. Fetch unprocessed events with row locking for concurrency
        const events = await tx
          .select()
          .from(outbox)
          .where(isNull(outbox.processedAt))
          .orderBy(outbox.createdAt)
          .limit(10)
          .for('update', { skipLocked: true });

        for (const event of events) {
          // 2. Publish to NATS - payload is already an object from Drizzle
          await natsClient.publish(event.eventType, event.payload);
          logger.info(`Published event: ${event.eventType} (${event.aggregateId})`);

          // 3. Mark as processed
          await tx.update(outbox)
            .set({ processedAt: new Date() })
            .where(eq(outbox.id, event.id));
        }
      });
    } catch (error) {
      logger.error('Error processing outbox', error);
    }

    // Sleep for 100ms
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

processOutbox().catch(console.error);
