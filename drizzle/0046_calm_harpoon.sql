ALTER TABLE `pool_members` ADD `memberStatus` enum('active','pending_approval','rejected') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `pool_members` ADD `paymentRequestedAt` timestamp;--> statement-breakpoint
ALTER TABLE `pools` ADD `entryFee` decimal(10,2);--> statement-breakpoint
ALTER TABLE `pools` ADD `entryQrCodeUrl` text;