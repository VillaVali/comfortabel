CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(128) NOT NULL,
	`invitedBy` int,
	`acceptedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_invitedBy_users_id_fk` FOREIGN KEY (`invitedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;