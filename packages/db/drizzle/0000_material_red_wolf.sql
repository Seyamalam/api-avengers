CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"goal_amount" integer NOT NULL,
	"current_amount" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pledges" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"user_id" integer,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'PENDING',
	"payment_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'user',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
