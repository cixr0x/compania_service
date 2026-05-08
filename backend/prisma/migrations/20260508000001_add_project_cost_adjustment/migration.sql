ALTER TABLE `project`
ADD COLUMN `cost_adjustment` DECIMAL(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN `adjustment_description` TEXT NULL;
