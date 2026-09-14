CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"title" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT '未作業' NOT NULL,
	"content" text,
	"assignee" varchar(30),
	"planned_start_on" date,
	"planned_end_on" date,
	"work_content" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"title" varchar(100),
	"doc_type" varchar(10) DEFAULT '見積書' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT 10 NOT NULL,
	"note" text,
	"created_on" date DEFAULT now() NOT NULL,
	"sent_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(100),
	"postal_code" varchar(10),
	"address" varchar(200),
	"building" varchar(100),
	"phone" varchar(30),
	"fax" varchar(30),
	"website" varchar(200),
	"email" varchar(255),
	"tax_rate" numeric(5, 2) DEFAULT 10 NOT NULL,
	"invoice_number" varchar(50),
	"bank_info" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"model_name" varchar(100) NOT NULL,
	"vehicle_number" varchar(50),
	"maker" varchar(30),
	"displacement" integer,
	"model_year" integer,
	"color" varchar(30),
	"registered_on" date,
	"inspection_expires_on" date,
	"insurance_info" text,
	"accident_history" text,
	"customization_info" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "equipment_items" CASCADE;--> statement-breakpoint
DROP TABLE "equipment_loans" CASCADE;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "postal_code" varchar(10);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "address_line2" varchar(200);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "building" varchar(100);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "mobile_phone" varchar(30);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "license_number" varchar(50);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;