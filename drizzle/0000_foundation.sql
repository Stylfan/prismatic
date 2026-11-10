CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`seq` integer NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`scope_override` integer,
	`done_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `milestones_seq_uq` ON `milestones` (`program_id`,`seq`);--> statement-breakpoint
CREATE INDEX `milestones_program_idx` ON `milestones` (`program_id`);--> statement-breakpoint
CREATE TABLE `program_sizes` (
	`program_id` text NOT NULL,
	`level` text NOT NULL,
	`size` text NOT NULL,
	`points` integer NOT NULL,
	PRIMARY KEY(`program_id`, `level`, `size`),
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`goal` text DEFAULT '' NOT NULL,
	`period_model` text DEFAULT 'seasons' NOT NULL,
	`start_date` text NOT NULL,
	`quarter_horizon` integer DEFAULT 2 NOT NULL,
	`cost_per_quarter` integer,
	`deviation_pct` integer DEFAULT 10 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
