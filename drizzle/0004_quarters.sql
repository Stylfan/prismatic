CREATE TABLE `quarter_records` (
	`program_id` text NOT NULL,
	`quarter_index` integer NOT NULL,
	`capacity_pct` integer DEFAULT 100 NOT NULL,
	`delivered_override` integer,
	`planned_override` integer,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`program_id`, `quarter_index`),
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade
);
