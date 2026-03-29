ALTER TABLE `tournaments` ADD `isAvailable` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `apiFootballLeagueId` int;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `apiFootballSeason` int;