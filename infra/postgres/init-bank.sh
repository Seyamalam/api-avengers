#!/bin/bash
set -e

# Wait for postgres to be ready
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$PGHOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q'; do
  >&2 echo "Postgres ($PGHOST) is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres ($PGHOST) is up - initializing bank data"

# Create bank tables and seed data
PGPASSWORD=$POSTGRES_PASSWORD psql -h "$PGHOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
    -- Insert test bank accounts with various balances
    INSERT INTO bank_accounts (account_number, account_holder_name, email, balance, currency, is_active) VALUES
    ('ACC001', 'John Doe', 'john.doe@example.com', 10000.00, 'USD', true),
    ('ACC002', 'Jane Smith', 'jane.smith@example.com', 5000.00, 'USD', true),
    ('ACC003', 'Bob Johnson', 'bob.johnson@example.com', 25000.00, 'USD', true),
    ('ACC004', 'Alice Williams', 'alice.williams@example.com', 500.00, 'USD', true),
    ('ACC005', 'Charlie Brown', 'charlie.brown@example.com', 15000.00, 'USD', true),
    ('ACC006', 'Diana Prince', 'diana.prince@example.com', 50000.00, 'USD', true),
    ('ACC007', 'Edward Norton', 'edward.norton@example.com', 8000.00, 'USD', true),
    ('ACC008', 'Fiona Green', 'fiona.green@example.com', 3000.00, 'USD', true),
    ('ACC009', 'George Wilson', 'george.wilson@example.com', 12000.00, 'USD', true),
    ('ACC010', 'Hannah Montana', 'hannah.montana@example.com', 100.00, 'USD', true),
    ('ACC011', 'Isaac Newton', 'isaac.newton@example.com', 20000.00, 'USD', true),
    ('ACC012', 'Julia Roberts', 'julia.roberts@example.com', 7500.00, 'USD', true),
    ('ACC013', 'Kevin Hart', 'kevin.hart@example.com', 4500.00, 'USD', true),
    ('ACC014', 'Laura Palmer', 'laura.palmer@example.com', 18000.00, 'USD', true),
    ('ACC015', 'Michael Scott', 'michael.scott@example.com', 6000.00, 'USD', true),
    ('ACC016', 'Nancy Drew', 'nancy.drew@example.com', 9500.00, 'USD', true),
    ('ACC017', 'Oliver Twist', 'oliver.twist@example.com', 50.00, 'USD', true),
    ('ACC018', 'Peter Parker', 'peter.parker@example.com', 13000.00, 'USD', true),
    ('ACC019', 'Quinn Fabray', 'quinn.fabray@example.com', 22000.00, 'USD', true),
    ('ACC020', 'Rachel Green', 'rachel.green@example.com', 11000.00, 'USD', true),
    ('ACC021', 'Sam Winchester', 'sam.winchester@example.com', 16000.00, 'USD', true),
    ('ACC022', 'Tina Turner', 'tina.turner@example.com', 14000.00, 'USD', true),
    ('ACC023', 'Uma Thurman', 'uma.thurman@example.com', 19000.00, 'USD', true),
    ('ACC024', 'Victor Hugo', 'victor.hugo@example.com', 8500.00, 'USD', true),
    ('ACC025', 'Wendy Williams', 'wendy.williams@example.com', 10500.00, 'USD', true),
    ('ACC026', 'Xavier Woods', 'xavier.woods@example.com', 30000.00, 'USD', true),
    ('ACC027', 'Yara Shahidi', 'yara.shahidi@example.com', 17000.00, 'USD', true),
    ('ACC028', 'Zack Morris', 'zack.morris@example.com', 12500.00, 'USD', true),
    ('ACC029', 'Amy Adams', 'amy.adams@example.com', 9000.00, 'USD', true),
    ('ACC030', 'Bruce Wayne', 'bruce.wayne@example.com', 1000000.00, 'USD', true),
    ('ACC031', 'Clark Kent', 'clark.kent@example.com', 45000.00, 'USD', true),
    ('ACC032', 'David Beckham', 'david.beckham@example.com', 35000.00, 'USD', true),
    ('ACC033', 'Emma Watson', 'emma.watson@example.com', 28000.00, 'USD', true),
    ('ACC034', 'Frank Sinatra', 'frank.sinatra@example.com', 21000.00, 'USD', true),
    ('ACC035', 'Grace Kelly', 'grace.kelly@example.com', 33000.00, 'USD', true),
    ('ACC036', 'Harry Potter', 'harry.potter@example.com', 5500.00, 'USD', true),
    ('ACC037', 'Iris West', 'iris.west@example.com', 14500.00, 'USD', true),
    ('ACC038', 'Jack Ryan', 'jack.ryan@example.com', 26000.00, 'USD', true),
    ('ACC039', 'Kate Middleton', 'kate.middleton@example.com', 40000.00, 'USD', true),
    ('ACC040', 'Liam Neeson', 'liam.neeson@example.com', 15500.00, 'USD', true),
    ('ACC041', 'Monica Geller', 'monica.geller@example.com', 11500.00, 'USD', true),
    ('ACC042', 'Nick Fury', 'nick.fury@example.com', 23000.00, 'USD', true),
    ('ACC043', 'Olivia Pope', 'olivia.pope@example.com', 32000.00, 'USD', true),
    ('ACC044', 'Paul Walker', 'paul.walker@example.com', 19500.00, 'USD', true),
    ('ACC045', 'Quentin Tarantino', 'quentin.tarantino@example.com', 27000.00, 'USD', true),
    ('ACC046', 'Ross Geller', 'ross.geller@example.com', 13500.00, 'USD', true),
    ('ACC047', 'Sarah Connor', 'sarah.connor@example.com', 17500.00, 'USD', true),
    ('ACC048', 'Tony Stark', 'tony.stark@example.com', 999999.00, 'USD', true),
    ('ACC049', 'Ursula Buffay', 'ursula.buffay@example.com', 8800.00, 'USD', true),
    ('ACC050', 'Violet Baudelaire', 'violet.baudelaire@example.com', 24000.00, 'USD', true),
    
    -- Add some accounts with low balance for testing insufficient funds
    ('ACC051', 'Poor Pete', 'poor.pete@example.com', 10.00, 'USD', true),
    ('ACC052', 'Broke Betty', 'broke.betty@example.com', 25.00, 'USD', true),
    ('ACC053', 'Empty Emma', 'empty.emma@example.com', 5.00, 'USD', true),
    
    -- Add an inactive account for testing
    ('ACC054', 'Inactive Ivan', 'inactive.ivan@example.com', 5000.00, 'USD', false),
    
    -- Add wealthy accounts for large donations
    ('ACC055', 'Rich Richard', 'rich.richard@example.com', 500000.00, 'USD', true),
    ('ACC056', 'Wealthy Wendy', 'wealthy.wendy@example.com', 750000.00, 'USD', true),
    ('ACC057', 'Millionaire Mike', 'millionaire.mike@example.com', 1500000.00, 'USD', true),
    ('ACC058', 'Billionaire Bill', 'billionaire.bill@example.com', 10000000.00, 'USD', true),
    
    -- Add accounts with moderate balances
    ('ACC059', 'Normal Nancy', 'normal.nancy@example.com', 3500.00, 'USD', true),
    ('ACC060', 'Average Andy', 'average.andy@example.com', 4200.00, 'USD', true)
    ON CONFLICT (account_number) DO NOTHING;

    -- Add some sample transactions for history
    INSERT INTO bank_transactions (account_id, type, amount, balance_before, balance_after, reference, status, description) 
    SELECT 
        id,
        'CREDIT',
        1000.00,
        balance::numeric - 1000.00,
        balance::numeric,
        'INITIAL_DEPOSIT',
        'COMPLETED',
        'Initial account funding'
    FROM bank_accounts 
    WHERE account_number IN ('ACC001', 'ACC030', 'ACC048')
    ON CONFLICT DO NOTHING;

EOSQL

echo "Bank data initialization complete!"
