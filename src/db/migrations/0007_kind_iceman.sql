CREATE TABLE "assignees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(30) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN "tax_rate" numeric(5, 2) DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "internal_note" text;