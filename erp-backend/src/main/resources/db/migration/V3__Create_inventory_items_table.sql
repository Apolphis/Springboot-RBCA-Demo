CREATE TABLE inventory_items (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    category      VARCHAR(100) NOT NULL,
    item_name     VARCHAR(255) NOT NULL,
    quantity      INTEGER      NOT NULL CHECK (quantity >= 0),
    created_by    VARCHAR(255) NOT NULL
);
