CREATE TABLE `item_usage_history` (
	`id` text PRIMARY KEY NOT NULL,
	`home_id` text NOT NULL,
	`item_id` text,
	`item_name` text NOT NULL,
	`marked_by` text,
	`action` text NOT NULL,
	`quantity` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`home_id`) REFERENCES `homes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`marked_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `homes` ADD `household_size` integer;--> statement-breakpoint
ALTER TABLE `homes` ADD `shared_dietary_restrictions` text;--> statement-breakpoint
ALTER TABLE `items` ADD `added_by` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `users` ADD `dietary_restrictions` text;--> statement-breakpoint
ALTER TABLE `users` ADD `cooking_skill_level` text;--> statement-breakpoint
ALTER TABLE `users` ADD `budget_consciousness` text;