const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function clearDb() {
    console.log('Starting execution...');

    // Read .env manually
    const envPath = path.resolve(__dirname, '../.env');
    console.log(`Reading .env from ${envPath}`);

    let fileContent;
    try {
        fileContent = fs.readFileSync(envPath, 'utf8');
    } catch (e) {
        console.error('Could not read .env file. Please make sure it exists in the root directory.');
        process.exit(1);
    }

    const env = {};
    const foundKeys = [];

    fileContent.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;

        const firstEqualsIndex = line.indexOf('=');
        if (firstEqualsIndex !== -1) {
            const key = line.substring(0, firstEqualsIndex).trim();
            let value = line.substring(firstEqualsIndex + 1).trim();

            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            env[key] = value;
            foundKeys.push(key);
        }
    });
    console.log('Keys found in .env:', foundKeys.join(', '));

    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        console.error('Error: NEXT_PUBLIC_SUPABASE_URL not found in .env');
        process.exit(1);
    }

    if (!serviceRoleKey) {
        console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY not found in .env.');
        console.warn('Attempting to use NEXT_PUBLIC_SUPABASE_ANON_KEY instead, but deletion might fail due to RLS policies.');
    }

    const keyToUse = serviceRoleKey || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!keyToUse) {
        console.error('Error: No Supabase keys found in .env');
        process.exit(1);
    }

    console.log('Initializing Supabase client...');
    const supabase = createClient(supabaseUrl, keyToUse, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // Order matters due to foreign keys
    const tables = [
        'poll_votes',
        'polls',
        'message_reactions',
        'thread_messages',
        'reports',
        'echo_threads',
        'confessions',
        'vault_suggestions'
    ];

    console.log('Clearing tables...');

    for (const table of tables) {
        // Delete all rows where id is not equal to a simplified nil UUID (matches all valid UUIDs)
        const { error, count } = await supabase
            .from(table)
            .delete({ count: 'exact' })
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) {
            console.error(`Failed to clear ${table}:`, error.message);
        } else {
            console.log(`Successfully cleared ${table}. Rows deleted: ${count}`);
        }
    }

    console.log('Database cleanup complete! Users can now confess fresh.');
}

clearDb().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
