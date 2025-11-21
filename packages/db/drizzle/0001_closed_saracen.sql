CREATE TABLE "campaign_processed_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"pledge_id" integer NOT NULL,
	"processed_at" timestamp DEFAULT now(),
	CONSTRAINT "campaign_processed_events_event_id_unique" UNIQUE("event_id")
);
