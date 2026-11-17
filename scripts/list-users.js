const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env
const envPath = path.resolve(__dirname, '..', '.env');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function listUsers() {
  try {
    const { data: userData, error: userErr } = await supabase.auth.admin.listUsers();
    if (userErr) {
      console.error('Error fetching auth users:', userErr.message);
      return;
    }

    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: roles } = await supabase.from('user_roles').select('*');

    console.log('\n--- Registered Users ---');
    for (const u of userData.users) {
      const profile = (profiles || []).find((p) => p.id === u.id);
      const userRoles = (roles || []).filter((r) => r.user_id === u.id).map((r) => r.role);

      console.log({
        id: u.id,
        email: u.email,
        phone: profile?.phone || u.phone || 'N/A',
        name: profile?.full_name || u.user_metadata?.full_name || 'N/A',
        roles: userRoles.length > 0 ? userRoles : ['none'],
        status: profile?.status || 'active',
      });
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

listUsers();
