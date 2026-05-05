-- CreateTable
CREATE TABLE `model` (
    `id_model` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,

    PRIMARY KEY (`id_model`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `image` TEXT NULL,
    `id_ecommerce` VARCHAR(255) NULL,
    `id_store` VARCHAR(255) NULL,
    `id_event` VARCHAR(255) NULL,
    `id_surface` VARCHAR(255) NULL,
    `id_model` INTEGER NULL,
    `ownership` DECIMAL(7, 2) NOT NULL DEFAULT 0,
    `tag` VARCHAR(255) NULL,

    UNIQUE INDEX `product_id_ecommerce_key`(`id_ecommerce`),
    UNIQUE INDEX `product_id_store_key`(`id_store`),
    UNIQUE INDEX `product_id_event_key`(`id_event`),
    UNIQUE INDEX `product_id_surface_key`(`id_surface`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project` (
    `id_project` INTEGER NOT NULL AUTO_INCREMENT,
    `id_product` INTEGER NOT NULL,
    `units` INTEGER NOT NULL,
    `unit_cost` DECIMAL(12, 2) NOT NULL,
    `admin_cost` DECIMAL(12, 2) NOT NULL,

    PRIMARY KEY (`id_project`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stakeholder` (
    `id_stakeholder` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id_stakeholder`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_stakeholder` (
    `id_project_stakeholder` INTEGER NOT NULL AUTO_INCREMENT,
    `id_project` INTEGER NOT NULL,
    `id_stakeholder` INTEGER NOT NULL,
    `stake_percentage` DECIMAL(7, 2) NOT NULL,

    UNIQUE INDEX `project_stakeholder_id_project_id_stakeholder_key`(`id_project`, `id_stakeholder`),
    PRIMARY KEY (`id_project_stakeholder`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales` (
    `id_sale` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL,
    `id_product` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `source` VARCHAR(50) NOT NULL,
    `fee` DECIMAL(12, 2) NOT NULL DEFAULT 0,

    PRIMARY KEY (`id_sale`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_batch` (
    `id_import_batch` INTEGER NOT NULL AUTO_INCREMENT,
    `source` VARCHAR(50) NOT NULL,
    `import_date` DATETIME(3) NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `status` ENUM('uploaded', 'validated', 'has_errors', 'committed', 'cancelled') NOT NULL DEFAULT 'uploaded',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `committed_at` DATETIME(3) NULL,

    PRIMARY KEY (`id_import_batch`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_stage` (
    `id_import_stage` INTEGER NOT NULL AUTO_INCREMENT,
    `id_import_batch` INTEGER NOT NULL,
    `row_number` INTEGER NOT NULL,
    `external_product_id` VARCHAR(255) NULL,
    `imported_product_description` TEXT NULL,
    `id_product` INTEGER NULL,
    `quantity` INTEGER NULL,
    `amount` DECIMAL(12, 2) NULL,
    `raw_row` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `import_stage_id_import_batch_idx`(`id_import_batch`),
    PRIMARY KEY (`id_import_stage`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_error` (
    `id_import_error` INTEGER NOT NULL AUTO_INCREMENT,
    `id_import_batch` INTEGER NOT NULL,
    `id_import_stage` INTEGER NULL,
    `row_number` INTEGER NULL,
    `field` VARCHAR(100) NULL,
    `message` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `import_error_id_import_batch_idx`(`id_import_batch`),
    PRIMARY KEY (`id_import_error`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_id_model_fkey` FOREIGN KEY (`id_model`) REFERENCES `model`(`id_model`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project` ADD CONSTRAINT `project_id_product_fkey` FOREIGN KEY (`id_product`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_stakeholder` ADD CONSTRAINT `project_stakeholder_id_project_fkey` FOREIGN KEY (`id_project`) REFERENCES `project`(`id_project`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_stakeholder` ADD CONSTRAINT `project_stakeholder_id_stakeholder_fkey` FOREIGN KEY (`id_stakeholder`) REFERENCES `stakeholder`(`id_stakeholder`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_id_product_fkey` FOREIGN KEY (`id_product`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `import_stage` ADD CONSTRAINT `import_stage_id_import_batch_fkey` FOREIGN KEY (`id_import_batch`) REFERENCES `import_batch`(`id_import_batch`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `import_stage` ADD CONSTRAINT `import_stage_id_product_fkey` FOREIGN KEY (`id_product`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `import_error` ADD CONSTRAINT `import_error_id_import_batch_fkey` FOREIGN KEY (`id_import_batch`) REFERENCES `import_batch`(`id_import_batch`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `import_error` ADD CONSTRAINT `import_error_id_import_stage_fkey` FOREIGN KEY (`id_import_stage`) REFERENCES `import_stage`(`id_import_stage`) ON DELETE CASCADE ON UPDATE CASCADE;
