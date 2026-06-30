CREATE TABLE `propertyDataPoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`category` varchar(64) NOT NULL,
	`component` varchar(100) NOT NULL,
	`label` varchar(200),
	`value` text,
	`unit` varchar(30),
	`source` enum('klant','telefoon_intake','ai','foto','comfortabel','specialist','bag','import') NOT NULL DEFAULT 'klant',
	`confidence` int NOT NULL DEFAULT 50,
	`verificationStatus` enum('unverified','self_reported','photo_verified','physically_verified','ai_inferred') NOT NULL DEFAULT 'self_reported',
	`verifiedAt` timestamp,
	`verifiedBy` int,
	`linkedPhotoIds` text,
	`linkedDocumentIds` text,
	`maintenanceStatus` enum('goed','aandacht','urgent','onbekend') DEFAULT 'onbekend',
	`riskScore` int,
	`urgencyScore` int,
	`aiNotes` text,
	`aiFlags` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `propertyDataPoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `propertyDataPoints` ADD CONSTRAINT `propertyDataPoints_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `propertyDataPoints` ADD CONSTRAINT `propertyDataPoints_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `propertyDataPoints` ADD CONSTRAINT `propertyDataPoints_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;