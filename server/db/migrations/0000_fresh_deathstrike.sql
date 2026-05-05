CREATE TABLE `diagnosis` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`top_profile_id` text NOT NULL,
	`result_json` text NOT NULL,
	`llm_model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`top_profile_id`) REFERENCES `top_profile`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `diagnosis_session_id_idx` ON `diagnosis` (`session_id`);--> statement-breakpoint
CREATE TABLE `salon` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`kind` text NOT NULL,
	`input_mode` text NOT NULL,
	`recorded_at` integer NOT NULL,
	`audio_key` text,
	`transcript` text NOT NULL,
	`duration_sec` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_staff_id_idx` ON `session` (`staff_id`);--> statement-breakpoint
CREATE TABLE `staff` (
	`id` text PRIMARY KEY NOT NULL,
	`salon_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`salon_id`) REFERENCES `salon`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `staff_salon_id_idx` ON `staff` (`salon_id`);--> statement-breakpoint
CREATE TABLE `top_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`salon_id` text NOT NULL,
	`version` integer NOT NULL,
	`source_session_ids` text NOT NULL,
	`profile_json` text NOT NULL,
	`llm_model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`salon_id`) REFERENCES `salon`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `top_profile_salon_id_idx` ON `top_profile` (`salon_id`);