CREATE TABLE `program_events` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`quarter_index` integer NOT NULL,
	`title` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `program_events_program_idx` ON `program_events` (`program_id`,`quarter_index`);--> statement-breakpoint
ALTER TABLE `milestones` ADD `period_index` integer;--> statement-breakpoint
ALTER TABLE `milestones` ADD `period_span` integer DEFAULT 1 NOT NULL;