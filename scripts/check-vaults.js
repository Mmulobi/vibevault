const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkVaults() {
    console.log('Checking vaults table...');

    const envPath = path.resolve(__dirname, '../.env');
    let fileContent;
    try {
        fileContent = fs.readFileSync(envPath, 'utf8');
    } catch (e) {
        console.error('Could not read .env file.');
        process.exit(1);
    }

    const env = {};
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
        }
    });

    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !key) {
        console.error('Missing Supabase credentials in .env');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, key);

    const { data, error, count } = await supabase
        .from('vaults')
        .select('*', { count: 'exact' });

    if (error) {
        console.error('Error fetching vaults:', error.message);
    } else {
        console.log(`Vaults count: ${count}`);
        if (data && data.length > 0) {
            console.log('First vault:', data[0]);
        } else {
            console.log('Vaults table is empty!');
        }
    }
}

checkVaults();
