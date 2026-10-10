CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`dataset` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_records_dataset_kind` ON `records` (`dataset`,`kind`);