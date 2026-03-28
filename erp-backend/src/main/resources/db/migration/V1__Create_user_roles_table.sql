CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_identifier VARCHAR(255) NOT NULL,
    role_name VARCHAR(50) NOT NULL
);

CREATE INDEX idx_user_roles_identifier ON user_roles(user_identifier);

-- Seed our initial admin user
INSERT INTO user_roles (user_identifier, role_name) 
VALUES ('admin@local.test', 'ADMIN');
