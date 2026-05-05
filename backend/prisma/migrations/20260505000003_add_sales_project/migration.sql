ALTER TABLE `sales`
ADD COLUMN `id_project` INTEGER NULL;

UPDATE `sales` AS `s`
INNER JOIN `project` AS `p`
  ON `p`.`id_product` = `s`.`id_product`
  AND `p`.`is_active` = true
SET `s`.`id_project` = `p`.`id_project`
WHERE `s`.`id_project` IS NULL;

ALTER TABLE `sales`
MODIFY COLUMN `id_project` INTEGER NOT NULL;

CREATE INDEX `sales_id_project_fkey` ON `sales`(`id_project`);

ALTER TABLE `sales`
ADD CONSTRAINT `sales_id_project_fkey`
FOREIGN KEY (`id_project`) REFERENCES `project`(`id_project`)
ON DELETE RESTRICT ON UPDATE CASCADE;
