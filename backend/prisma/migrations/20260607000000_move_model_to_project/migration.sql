ALTER TABLE `project`
ADD COLUMN `id_model` INTEGER NULL;

UPDATE `project` AS `project_row`
JOIN `model` AS `model_row`
  ON `model_row`.`code` = 'ladrillo'
SET `project_row`.`id_model` = `model_row`.`id_model`
WHERE `project_row`.`id_model` IS NULL;

ALTER TABLE `project`
MODIFY COLUMN `id_model` INTEGER NOT NULL;

ALTER TABLE `project`
ADD CONSTRAINT `project_id_model_fkey`
FOREIGN KEY (`id_model`) REFERENCES `model`(`id_model`)
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `project`
DROP INDEX `project_one_active_per_product`;

ALTER TABLE `project`
DROP COLUMN `active_product_id`;

ALTER TABLE `import_stage`
ADD COLUMN `id_project` INTEGER NULL;

CREATE INDEX `import_stage_id_project_idx` ON `import_stage`(`id_project`);

ALTER TABLE `import_stage`
ADD CONSTRAINT `import_stage_id_project_fkey`
FOREIGN KEY (`id_project`) REFERENCES `project`(`id_project`)
ON DELETE SET NULL ON UPDATE CASCADE;
