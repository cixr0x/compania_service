INSERT INTO `settings` (`code`, `name`, `description`, `value`)
VALUES (
    'sales_tax',
    'Sales Tax',
    'Decimal tax multiplier used by manual sales, for example 0.034 for 3.4%.',
    '0.034'
)
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`);
