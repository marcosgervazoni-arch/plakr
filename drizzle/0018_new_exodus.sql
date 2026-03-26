ALTER TABLE `badges` ADD `emoji` varchar(8);--> statement-breakpoint
ALTER TABLE `badges` ADD `category` varchar(64);--> statement-breakpoint
ALTER TABLE `badges` ADD `isManual` boolean DEFAULT false NOT NULL;