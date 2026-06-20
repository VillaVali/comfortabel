CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`action` varchar(64) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int,
	`previousValue` text,
	`newValue` text,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `changeRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`requestedBy` int NOT NULL,
	`fieldCategory` enum('A','B') NOT NULL,
	`fieldName` varchar(100) NOT NULL,
	`currentValue` text,
	`proposedValue` text,
	`note` text,
	`status` enum('open','approved','rejected') NOT NULL DEFAULT 'open',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `changeRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`consentType` varchar(64) NOT NULL,
	`granted` boolean NOT NULL DEFAULT false,
	`grantedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dossierNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`propertyId` int,
	`title` varchar(200),
	`body` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dossierNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text,
	`type` varchar(64) NOT NULL DEFAULT 'info',
	`isRead` boolean NOT NULL DEFAULT false,
	`linkUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `propertyMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('pending_applicant','owner','tenant','partner','business_manager','comfortabel_employee','manager','admin') NOT NULL DEFAULT 'pending_applicant',
	`status` enum('pending','active','revoked') NOT NULL DEFAULT 'pending',
	`confirmedBy` int,
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `propertyMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userProfile` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`phone` varchar(30),
	`preferredContact` enum('email','phone','none') DEFAULT 'email',
	`marketingOptIn` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProfile_id` PRIMARY KEY(`id`),
	CONSTRAINT `userProfile_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `properties` MODIFY COLUMN `customerId` int;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','comfortabel_employee','manager','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `properties` ADD `addition` varchar(20);--> statement-breakpoint
ALTER TABLE `properties` ADD `houseLetter` varchar(5);--> statement-breakpoint
ALTER TABLE `properties` ADD `normalizedAddressKey` varchar(64);--> statement-breakpoint
ALTER TABLE `properties` ADD `bagId` varchar(32);--> statement-breakpoint
ALTER TABLE `properties` ADD `bagObjectId` varchar(32);--> statement-breakpoint
ALTER TABLE `properties` ADD `bagNumberDesignationId` varchar(32);--> statement-breakpoint
ALTER TABLE `properties` ADD `addressValidationStatus` enum('unvalidated','validated','manual','conflict') DEFAULT 'unvalidated' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `addressSource` enum('customer','admin','bag','import','migration') DEFAULT 'customer' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `status` enum('concept','ingevuld','gevalideerd','aandacht') DEFAULT 'concept' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `createdByRole` enum('user','comfortabel_employee','manager','admin','migration') DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `createdByUserId` int;--> statement-breakpoint
ALTER TABLE `properties` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_normalizedAddressKey_unique` UNIQUE(`normalizedAddressKey`);--> statement-breakpoint
ALTER TABLE `auditLog` ADD CONSTRAINT `auditLog_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `changeRequests` ADD CONSTRAINT `changeRequests_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `changeRequests` ADD CONSTRAINT `changeRequests_requestedBy_users_id_fk` FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `changeRequests` ADD CONSTRAINT `changeRequests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consents` ADD CONSTRAINT `consents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dossierNotes` ADD CONSTRAINT `dossierNotes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dossierNotes` ADD CONSTRAINT `dossierNotes_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `propertyMembers` ADD CONSTRAINT `propertyMembers_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `propertyMembers` ADD CONSTRAINT `propertyMembers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `propertyMembers` ADD CONSTRAINT `propertyMembers_confirmedBy_users_id_fk` FOREIGN KEY (`confirmedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userProfile` ADD CONSTRAINT `userProfile_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;