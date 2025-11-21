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
        // Using raw SQL for FOR UPDATE SKIP LOCKED support
        const events = await tx.execute(sql`
          SELECT * FROM ${outbox}
          WHERE ${outbox.processedAt} IS NULL
          ORDER BY ${outbox.createdAt} ASC
          LIMIT 10
          FOR UPDATE SKIP LOCKED
        `);

        for (const event of events.rows) {
          // 2. Publish to NATS
          await natsClient.publish(event.event_type as string, event.payload);
          logger.info(`Published event: ${event.event_type} (${event.aggregate_id})`);

          // 3. Mark as processed
          await tx.update(outbox)
            .set({ processedAt: new Date() })
            .where(eq(outbox.id, event.id as number));
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
