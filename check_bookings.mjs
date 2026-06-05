import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const VITE_SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const SUPABASE_SERVICE_ROLE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim() || env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

async function checkCol() {
  const res = await fetch(`${VITE_SUPABASE_URL}/rest/v1/bookings?select=payment_status&limit=1`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const data = await res.json();
  console.log("Check column:", JSON.stringify(data, null, 2));
}

checkCol();
