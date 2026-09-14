ALTER TABLE "cases" ADD CONSTRAINT "cases_case_number_unique" UNIQUE("case_number");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_customer_number_unique" UNIQUE("customer_number");--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_doc_number_unique" UNIQUE("doc_number");--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_manage_number_unique" UNIQUE("manage_number");