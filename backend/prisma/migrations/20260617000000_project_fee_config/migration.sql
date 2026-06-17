ALTER TABLE `project`
ADD COLUMN `fee_type` VARCHAR(50) NOT NULL DEFAULT 'sale_percentage',
ADD COLUMN `fee_value` DECIMAL(12, 2) NOT NULL DEFAULT 0.00;

UPDATE `project` AS `project_row`
LEFT JOIN `model` AS `model_row`
  ON `model_row`.`id_model` = `project_row`.`id_model`
LEFT JOIN `product` AS `product_row`
  ON `product_row`.`id` = `project_row`.`id_product`
SET
  `project_row`.`fee_type` = CASE
    WHEN LOWER(TRIM(COALESCE(`model_row`.`code`, ''))) = 'consigna' THEN 'fixed_per_unit'
    ELSE 'sale_percentage'
  END,
  `project_row`.`fee_value` = CASE
    WHEN LOWER(TRIM(COALESCE(`model_row`.`code`, ''))) = 'consigna256' THEN 25.00
    WHEN LOWER(TRIM(COALESCE(`model_row`.`code`, ''))) = 'interno' THEN 10.00
    WHEN LOWER(TRIM(COALESCE(`model_row`.`code`, ''))) = 'ladrillo' THEN 18.00
    WHEN LOWER(TRIM(COALESCE(`model_row`.`code`, ''))) = 'consigna' THEN COALESCE(`product_row`.`fee_amount`, 0.00)
    ELSE 0.00
  END;

ALTER TABLE `project`
DROP FOREIGN KEY `project_id_model_fkey`;

ALTER TABLE `product`
DROP FOREIGN KEY `product_id_model_fkey`;

ALTER TABLE `project`
DROP COLUMN `id_model`;

ALTER TABLE `product`
DROP COLUMN `id_model`,
DROP COLUMN `fee_amount`;

DROP TABLE `model`;
