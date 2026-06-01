ALTER TABLE `properties` ADD `wozValue` int;--> statement-breakpoint
ALTER TABLE `properties` ADD `wozYear` int;--> statement-breakpoint
ALTER TABLE `properties` ADD `purchasePrice` int;--> statement-breakpoint
ALTER TABLE `properties` ADD `purchaseYear` int;--> statement-breakpoint
ALTER TABLE `properties` ADD `vveContribution` int;--> statement-breakpoint
ALTER TABLE `properties` ADD `mortgageProvider` varchar(200);--> statement-breakpoint
ALTER TABLE `properties` ADD `erfpachtCanon` int;--> statement-breakpoint
ALTER TABLE `properties` ADD `insuranceExpiry` timestamp;--> statement-breakpoint
ALTER TABLE `properties` ADD `ownershipType` enum('volle_eigendom','erfpacht','appartementsrecht','opstalrecht','onbekend') DEFAULT 'volle_eigendom';--> statement-breakpoint
ALTER TABLE `properties` ADD `kadastraleAanduiding` varchar(100);--> statement-breakpoint
ALTER TABLE `properties` ADD `isMonument` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `properties` ADD `monumentType` enum('rijksmonument','gemeentelijk','geen') DEFAULT 'geen';--> statement-breakpoint
ALTER TABLE `properties` ADD `hasErfpacht` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `properties` ADD `hasBeslag` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `properties` ADD `bestemmingUrl` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `bestemmingCategory` varchar(100);--> statement-breakpoint
ALTER TABLE `properties` ADD `buurtCode` varchar(20);--> statement-breakpoint
ALTER TABLE `properties` ADD `wijk` varchar(100);--> statement-breakpoint
ALTER TABLE `properties` ADD `foundationType` enum('paalfundering','strookfundering','plaatfundering','onbekend') DEFAULT 'onbekend';--> statement-breakpoint
ALTER TABLE `properties` ADD `roofType` enum('zadeldak','plat_dak','mansardedak','schilddak','lessenaarsdak','onbekend') DEFAULT 'onbekend';--> statement-breakpoint
ALTER TABLE `properties` ADD `roofMaterial` enum('dakpannen','bitumen','zink','riet','leisteen','onbekend') DEFAULT 'onbekend';--> statement-breakpoint
ALTER TABLE `properties` ADD `wallType` enum('spouwmuur','massief','houtskelet','onbekend') DEFAULT 'onbekend';--> statement-breakpoint
ALTER TABLE `properties` ADD `heatingSystem` enum('cv_ketel','warmtepomp','stadsverwarming','elektrisch','geen','onbekend') DEFAULT 'onbekend';--> statement-breakpoint
ALTER TABLE `properties` ADD `heatingYear` int;--> statement-breakpoint
ALTER TABLE `properties` ADD `hotWaterSystem` enum('combiketel','boiler','zonneboiler','warmtepomp','onbekend') DEFAULT 'onbekend';--> statement-breakpoint
ALTER TABLE `properties` ADD `hasSolarPanels` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `properties` ADD `solarPanelCount` int;--> statement-breakpoint
ALTER TABLE `properties` ADD `solarPanelYear` int;--> statement-breakpoint
ALTER TABLE `properties` ADD `hasEVCharger` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `properties` ADD `hasGasConnection` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `properties` ADD `glazingType` enum('enkel','dubbel','hr_plus','hr_plus_plus','triple','gemengd','onbekend') DEFAULT 'onbekend';--> statement-breakpoint
ALTER TABLE `properties` ADD `wallInsulation` enum('aanwezig','deels','afwezig','onbekend') DEFAULT 'onbekend';--> statement-breakpoint
ALTER TABLE `properties` ADD `roofInsulation` enum('aanwezig','deels','afwezig','onbekend') DEFAULT 'onbekend';--> statement-breakpoint
ALTER TABLE `properties` ADD `floorInsulation` enum('aanwezig','deels','afwezig','onbekend') DEFAULT 'onbekend';--> statement-breakpoint
ALTER TABLE `properties` ADD `targetEnergyLabel` enum('A+++','A++','A+','A','B','C','D','E','F','G');--> statement-breakpoint
ALTER TABLE `properties` ADD `gasVrijDoeljaar` int;--> statement-breakpoint
ALTER TABLE `properties` ADD `sustainabilityMeasures` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `subsidiesApplied` text;