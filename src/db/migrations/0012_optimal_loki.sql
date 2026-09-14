ALTER TABLE "staff_profiles" ADD COLUMN "staff_code" serial NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_staff_code_unique" UNIQUE("staff_code");