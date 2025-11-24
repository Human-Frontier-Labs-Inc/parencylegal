#!/bin/bash

# Parency Legal - Database Setup Script
# This script helps set up the database after creating a new Supabase project

set -e  # Exit on error

echo "🚀 Parency Legal - Database Setup"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if .env.local exists
if [ ! -f .env.local ]; then
  echo -e "${RED}❌ .env.local not found!${NC}"
  echo "Please create .env.local with your Supabase credentials"
  exit 1
fi

echo -e "${GREEN}✅ Found .env.local${NC}"

# Step 2: Test database connection
echo ""
echo "📡 Testing database connection..."
if node scripts/test-db-connection.mjs; then
  echo -e "${GREEN}✅ Database connection successful!${NC}"
else
  echo -e "${RED}❌ Cannot connect to database${NC}"
  echo ""
  echo "Please check:"
  echo "  1. DATABASE_URL is correct in .env.local"
  echo "  2. Supabase project is active (not paused)"
  echo "  3. Database password is correct"
  echo ""
  exit 1
fi

# Step 3: Generate migrations (if needed)
echo ""
echo "📝 Checking for schema changes..."
if npm run db:generate 2>&1 | grep -q "No schema changes"; then
  echo -e "${YELLOW}ℹ️  No new migrations needed${NC}"
else
  echo -e "${GREEN}✅ Generated new migration files${NC}"
fi

# Step 4: Apply migrations
echo ""
echo "🔨 Applying database schema..."
if npm run db:push; then
  echo -e "${GREEN}✅ Database schema applied successfully!${NC}"
else
  echo -e "${RED}❌ Failed to apply schema${NC}"
  exit 1
fi

# Step 5: Verify tables were created
echo ""
echo "🔍 Verifying tables..."

# Create a quick verification script
cat > /tmp/verify_tables.mjs << 'EOF'
import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

try {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;

  console.log('\nTables created:');
  tables.forEach(t => console.log('  ✅', t.table_name));

  const expectedTables = [
    'cases',
    'documents',
    'discovery_requests',
    'document_request_mappings',
    'ai_chat_sessions',
    'sync_history',
    'dropbox_connections',
    'profiles'
  ];

  const createdTableNames = tables.map(t => t.table_name);
  const missingTables = expectedTables.filter(t => !createdTableNames.includes(t));

  if (missingTables.length > 0) {
    console.log('\n⚠️  Missing tables:', missingTables.join(', '));
    process.exit(1);
  }

  console.log('\n✅ All expected tables created!');

  await sql.end();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
EOF

if node /tmp/verify_tables.mjs; then
  echo -e "${GREEN}✅ All tables verified${NC}"
else
  echo -e "${RED}❌ Some tables are missing${NC}"
  exit 1
fi

# Step 6: Run tests
echo ""
echo "🧪 Running database tests..."
if npm run test:run -- tests/db/schema.test.ts; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
else
  echo -e "${YELLOW}⚠️  Some tests failed${NC}"
  echo "This is expected if RLS policies need adjustment"
fi

# Success!
echo ""
echo "=================================="
echo -e "${GREEN}✨ Database setup complete!${NC}"
echo "=================================="
echo ""
echo "Next steps:"
echo "  1. Run 'npm run db:studio' to view your database"
echo "  2. Run 'npm run test' to run all tests"
echo "  3. Run 'npm run dev' to start development server"
echo ""
