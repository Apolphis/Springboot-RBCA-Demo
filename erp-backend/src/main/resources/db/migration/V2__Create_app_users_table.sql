CREATE TABLE app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_identifier VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

INSERT INTO app_users (user_identifier, password)
VALUES ('admin@local.test', 'password')
ON CONFLICT (user_identifier) DO NOTHING;
