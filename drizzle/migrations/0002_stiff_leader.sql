ALTER TABLE `properties` MODIFY COLUMN `subscriptionType` enum('free','digital','basis','plus','premium') DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `properties` ADD `subscriptionStartDate` timestamp;--> statement-breakpoint
ALTER TABLE `properties` ADD `subscriptionEndDate` timestamp;