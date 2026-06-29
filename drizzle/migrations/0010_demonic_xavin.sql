CREATE TABLE `zeroMeasurementRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`propertyId` int NOT NULL,
	`phone` varchar(30) NOT NULL,
	`preferredDate` varchar(30) NOT NULL,
	`notes` text,
	`status` enum('aangevraagd','ingepland','uitgevoerd','geannuleerd') NOT NULL DEFAULT 'aangevraagd',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `zeroMeasurementRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `properties` MODIFY COLUMN `subscriptionType` enum('free','digital','basis','plus','premium','founding') DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `userProfile` ADD `birthYear` int;--> statement-breakpoint
ALTER TABLE `userProfile` ADD `preferredContactTime` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `isFoundingMember` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `onboardingCompletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `zeroMeasurementRequests` ADD CONSTRAINT `zeroMeasurementRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `zeroMeasurementRequests` ADD CONSTRAINT `zeroMeasurementRequests_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;