ALTER TABLE `project`
  ADD COLUMN `fixed_roi` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `fixed_roi_percentage` DECIMAL(7, 2) NULL;
