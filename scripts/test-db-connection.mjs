import postgres from 'postgres';

// Try different connection string formats
const projectRef = 'xdpuwjbyjfgtknkmswka';
const password = 'P3auBNxXLF0foUjK';

const formats = [
  {
    name: 'Direct connection (port 5432)',
    url: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`
  },
  {
    name: 'Direct connection (port 6543 - IPv6)',
    url: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:6543/postgres`
  },
  {
    name: 'Pooler connection (us-west-1, port 5432)',
    url: `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`
  },
  {
    name: 'Pooler connection (us-west-1, port 6543)',
    url: `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
  },
  {
    name: 'Pooler connection (us-east-1, port 5432)',
    url: `postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
  },
];

console.log('🔍 Testing Supabase connection formats...\n');

for (const { name, url } of formats) {
  const maskedUrl = url.replace(password, '****');
  console.log(`\n📌 ${name}`);
  console.log(`   ${maskedUrl}`);

  try {
    const sql = postgres(url, {
      max: 1,
      connect_timeout: 5,
      idle_timeout: 5,
    });

    const result = await sql`SELECT 1 as test, version() as postgres_version`;
    console.log('   ✅ SUCCESS! Connection works!');
    console.log('   PostgreSQL version:', result[0].postgres_version.split(' ')[0], result[0].postgres_version.split(' ')[1]);

    // Test if we can create a table
    try {
      await sql`SELECT * FROM cases LIMIT 1`;
      console.log('   ✅ Can query "cases" table');
    } catch (e) {
      console.log('   ℹ️  "cases" table does not exist yet (needs migration)');
    }

    await sql.end();
    console.log('\n✨ Found working connection! Use this DATABASE_URL in .env.local');
    process.exit(0);
  } catch (error) {
    console.log('   ❌ Failed:', error.message.split('\n')[0]);
  }
}

console.log('\n\n❌ None of the connection formats worked.');
console.log('\n💡 Possible solutions:');
console.log('   1. Check if Supabase project is paused (free tier auto-pauses)');
console.log('   2. Verify password is correct in Supabase Dashboard > Settings > Database');
console.log('   3. Create a new Supabase project');
console.log('   4. Check Supabase status: https://status.supabase.com');
