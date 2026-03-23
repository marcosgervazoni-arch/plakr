ALTER TABLE `notifications` ADD `imageUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `notifications` ADD `actionUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `notifications` ADD `actionLabel` varchar(100);--> statement-breakpoint
ALTER TABLE `notifications` ADD `priority` enum('low','normal','high','urgent') DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `category` varchar(100);