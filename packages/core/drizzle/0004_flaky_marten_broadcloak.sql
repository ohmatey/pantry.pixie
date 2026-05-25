CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`home_id` text NOT NULL,
	`merchant` text,
	`purchased_at` integer,
	`currency` text,
	`total` real,
	`item_count` integer DEFAULT 0 NOT NULL,
	`scanned_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`home_id`) REFERENCES `homes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scanned_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `items` ADD `receipt_id` text REFERENCES receipts(id);--> statement-breakpoint
ALTER TABLE `notifications` ADD `count` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `updated_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `muted_notification_types` text;