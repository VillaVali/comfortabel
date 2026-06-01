CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`type` enum('particulier','bedrijf','vastgoed') NOT NULL DEFAULT 'particulier',
	`firstName` varchar(100),
	`lastName` varchar(100),
	`companyName` varchar(200),
	`email` varchar(320) NOT NULL,
	`phone` varchar(30),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int,
	`inspectionId` int,
	`type` enum('rapport','offerte','factuur','keuring','foto','overig') DEFAULT 'overig',
	`title` varchar(300) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` text,
	`mimeType` varchar(100),
	`uploadedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspectionItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inspectionId` int NOT NULL,
	`category` varchar(100) NOT NULL,
	`subcategory` varchar(100),
	`question` text NOT NULL,
	`answer` enum('goed','aandacht','urgent','nvt','onbekend') DEFAULT 'onbekend',
	`notes` text,
	`photoUrl` text,
	`sortOrder` int DEFAULT 0,
	CONSTRAINT `inspectionItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`performedBy` int,
	`type` enum('nulmeting','jaarlijks','tussentijds','calamiteit') NOT NULL DEFAULT 'nulmeting',
	`status` enum('concept','in_uitvoering','afgerond') NOT NULL DEFAULT 'concept',
	`inspectionDate` timestamp NOT NULL DEFAULT (now()),
	`summary` text,
	`scoreInstallaties` int,
	`scoreBouwkundig` int,
	`scoreVeiligheid` int,
	`scoreVochtVentilatie` int,
	`scoreEnergie` int,
	`totalScore` int,
	`woningGrade` enum('A','B','C','D','E'),
	`pdfUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenanceIssues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`inspectionId` int,
	`title` varchar(300) NOT NULL,
	`description` text,
	`category` varchar(100),
	`priority` enum('laag','normaal','hoog','urgent') NOT NULL DEFAULT 'normaal',
	`status` enum('open','in_behandeling','gepland','afgerond') NOT NULL DEFAULT 'open',
	`dueDate` timestamp,
	`resolvedAt` timestamp,
	`estimatedCost` float,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenanceIssues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenancePlanning` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`description` text,
	`category` varchar(100),
	`plannedYear` int,
	`horizon` enum('1jaar','3jaar','5jaar','10jaar','mjop') DEFAULT '3jaar',
	`estimatedCost` float,
	`status` enum('gepland','uitgevoerd','uitgesteld') NOT NULL DEFAULT 'gepland',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenancePlanning_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`street` varchar(200) NOT NULL,
	`houseNumber` varchar(20) NOT NULL,
	`postalCode` varchar(10) NOT NULL,
	`city` varchar(100) NOT NULL,
	`buildYear` int,
	`propertyType` enum('tussenwoning','hoekwoning','vrijstaand','appartement','bedrijfspand','overig') DEFAULT 'tussenwoning',
	`surfaceM2` int,
	`residents` int,
	`energyLabel` enum('A+++','A++','A+','A','B','C','D','E','F','G'),
	`subscriptionType` enum('basis','plus','premium','vve','verhuur') DEFAULT 'basis',
	`subscriptionActive` boolean NOT NULL DEFAULT true,
	`lastInspectionDate` timestamp,
	`nextInspectionDate` timestamp,
	`photoUrl` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_inspectionId_inspections_id_fk` FOREIGN KEY (`inspectionId`) REFERENCES `inspections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspectionItems` ADD CONSTRAINT `inspectionItems_inspectionId_inspections_id_fk` FOREIGN KEY (`inspectionId`) REFERENCES `inspections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_performedBy_users_id_fk` FOREIGN KEY (`performedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenanceIssues` ADD CONSTRAINT `maintenanceIssues_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenanceIssues` ADD CONSTRAINT `maintenanceIssues_inspectionId_inspections_id_fk` FOREIGN KEY (`inspectionId`) REFERENCES `inspections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenancePlanning` ADD CONSTRAINT `maintenancePlanning_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;