CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`kind` text NOT NULL,
	`parent_id` text,
	`milestone_id` text,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`track` text DEFAULT 'business' NOT NULL,
	`size` text,
	`points_override` integer,
	`integration` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`done_quarter` integer,
	`done_note` text DEFAULT '' NOT NULL,
	`period_index` integer,
	`period_span` integer DEFAULT 1 NOT NULL,
	`split_from_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`split_from_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `items_program_idx` ON `items` (`program_id`);--> statement-breakpoint
CREATE INDEX `items_parent_idx` ON `items` (`parent_id`);