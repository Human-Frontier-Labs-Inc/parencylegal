import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DATABASE_URL;
console.log('Testing:', url.replace(/:[^:@]+@/, ':****@'));

try {
  const sql = postgres(url, { max: 1, connect_timeout: 10 });
  const result = await sql`SELECT version(), current_database()`;
  console.log('✅ SUCCESS!');
  console.log('PostgreSQL:', result[0].version.split(' ')[1]);
  console.log('Database:', result[0].current_database);

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  console.log('\nTables created:');
  tables.forEach(t => console.log('  ✅', t.table_name));

  await sql.end();
  process.exit(0);
} catch (e) {
  console.log('❌ Error:', e.message);
  process.exit(1);
}
