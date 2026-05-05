ALTER TABLE `project`
ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `active_product_id` INT NULL,
ADD UNIQUE INDEX `project_one_active_per_product` (`active_product_id`);
