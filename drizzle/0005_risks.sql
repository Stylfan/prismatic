CREATE TABLE `risks` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`consequence` text DEFAULT '' NOT NULL,
	`mitigation` text DEFAULT '' NOT NULL,
	`change_note` text DEFAULT '' NOT NULL,
	`probability` integer DEFAULT 5 NOT NULL,
	`impact` integer DEFAULT 5 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `risks_number_uq` ON `risks` (`program_id`,`number`);