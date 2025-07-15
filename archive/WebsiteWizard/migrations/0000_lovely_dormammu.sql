CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`business_id` integer,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_id` integer NOT NULL,
	`datetime` text NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`notes` text,
	`is_auto_scheduled` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `availability_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `blocked_dates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`reason` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text NOT NULL,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`business_type` text NOT NULL,
	`stage` text DEFAULT 'scraped' NOT NULL,
	`website` text,
	`notes` text DEFAULT '',
	`score` integer DEFAULT 0,
	`priority` text DEFAULT 'medium',
	`tags` text,
	`source` text DEFAULT 'manual',
	`last_contact_date` text,
	`scheduled_time` text,
	`appointment_status` text DEFAULT 'confirmed',
	`payment_status` text DEFAULT 'pending',
	`total_amount` integer DEFAULT 0,
	`paid_amount` integer DEFAULT 0,
	`stripe_customer_id` text,
	`stripe_payment_link_id` text,
	`last_payment_date` text,
	`payment_notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`business_type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`total_contacts` integer DEFAULT 0 NOT NULL,
	`sent_count` integer DEFAULT 0 NOT NULL,
	`response_count` integer DEFAULT 0 NOT NULL,
	`message` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `progress_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_id` integer NOT NULL,
	`stage` text NOT NULL,
	`image_url` text NOT NULL,
	`date` text NOT NULL,
	`notes` text,
	`publicly_visible` integer DEFAULT true,
	`payment_required` integer DEFAULT false,
	`payment_amount` integer,
	`payment_status` text,
	`payment_notes` text,
	`stripe_link` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`business_type` text NOT NULL,
	`description` text NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`preview_url` text,
	`features` text
);
