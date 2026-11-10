CREATE TABLE `decision_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`title` text NOT NULL,
	`problem` text DEFAULT '' NOT NULL,
	`background` text DEFAULT '' NOT NULL,
	`key_points` text DEFAULT '' NOT NULL,
	`next_steps` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `decision_cases_program_idx` ON `decision_cases` (`program_id`);--> statement-breakpoint
CREATE TABLE `decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`title` text NOT NULL,
	`decided_on` text DEFAULT '' NOT NULL,
	`forum` text DEFAULT '' NOT NULL,
	`decision` text DEFAULT '' NOT NULL,
	`effect` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `decisions_program_idx` ON `decisions` (`program_id`);--> statement-breakpoint
CREATE TABLE `quarter_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`quarter_index` integer NOT NULL,
	`parent_id` text,
	`title` text NOT NULL,
	`stretch` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `quarter_goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quarter_goals_program_idx` ON `quarter_goals` (`program_id`,`quarter_index`);--> statement-breakpoint
CREATE TABLE `report_drafts` (
	`program_id` text PRIMARY KEY NOT NULL,
	`status_text` text DEFAULT '' NOT NULL,
	`change_text` text DEFAULT '' NOT NULL,
	`goals_quarter` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `report_editions` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`title` text NOT NULL,
	`published_at` integer NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `report_editions_program_idx` ON `report_editions` (`program_id`,`published_at`);