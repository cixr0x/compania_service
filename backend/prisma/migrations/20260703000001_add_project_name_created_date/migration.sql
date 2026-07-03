ALTER TABLE `project`
  ADD COLUMN `name` VARCHAR(255) NULL,
  ADD COLUMN `created_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

UPDATE `project` AS `project_row`
INNER JOIN `product` AS `product_row`
  ON `product_row`.`id` = `project_row`.`id_product`
SET `project_row`.`name` = `product_row`.`name`
WHERE `project_row`.`name` IS NULL OR TRIM(`project_row`.`name`) = '';

UPDATE `project`
SET `name` = CONCAT('Project #', `id_project`)
WHERE `name` IS NULL OR TRIM(`name`) = '';

ALTER TABLE `project`
  MODIFY COLUMN `name` VARCHAR(255) NOT NULL;
