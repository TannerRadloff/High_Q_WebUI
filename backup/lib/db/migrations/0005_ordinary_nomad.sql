CREATE TABLE IF NOT EXISTS "PasswordReset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"token" varchar(64) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "name" varchar(64);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "image" varchar(255);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "emailVerified" timestamp;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "provider" varchar(64);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
