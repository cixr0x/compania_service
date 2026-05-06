ALTER TABLE `model`
ADD COLUMN `code` VARCHAR(100) NULL;

CREATE UNIQUE INDEX `model_code_key` ON `model`(`code`);
