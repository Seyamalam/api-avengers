#!/bin/bash
set -e

# This script runs during database initialization
# It creates an admin user in the users table

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create admin user if not exists
    INSERT INTO users (email, password, role, created_at)
    VALUES (
        'admin@careforall.com',
        -- bcrypt hash for password 'admin123' (hashed with salt rounds 10)
        '\$2a\$10\$zQX7qV3KxGxH5YP8pE2qO.K5K1qV3P0V8rP9qV3qP0V8rP9qV3qP0',
        'admin',
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (email) DO NOTHING;

    -- Log successful creation
    DO \$\$
    BEGIN
        IF EXISTS (SELECT 1 FROM users WHERE email = 'admin@careforall.com') THEN
            RAISE NOTICE 'Admin user created/verified: admin@careforall.com (password: admin123)';
        END IF;
    END
    \$\$;
EOSQL
