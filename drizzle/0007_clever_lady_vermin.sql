ALTER TABLE `admin_logs` ADD `previousValue` json;--> statement-breakpoint
ALTER TABLE `admin_logs` ADD `correlationId` varchar(36);--> statement-breakpoint
ALTER TABLE `admin_logs` ADD `level` enum('info','warn','error') DEFAULT 'info' NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_logs` ADD `ipAddress` varchar(45);