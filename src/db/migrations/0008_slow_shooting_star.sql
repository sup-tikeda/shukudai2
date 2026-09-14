CREATE TABLE "staff_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"name_kana" varchar(60),
	"birthday" date,
	"hired_on" date,
	"retired_on" date,
	"position" varchar(30),
	"qualification" varchar(100),
	"postal_code" varchar(10),
	"address" varchar(200),
	"address_line2" varchar(200),
	"building" varchar(100),
	"phone" varchar(30),
	"mobile_phone" varchar(30),
	"email" varchar(255),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "assignees" CASCADE;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;