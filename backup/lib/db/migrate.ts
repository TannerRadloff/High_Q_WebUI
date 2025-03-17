import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({
  path: '.env.local',
});

// Check if we're in a build environment (Vercel or local build)
const isBuildEnvironment = process.env.NODE_ENV === 'production' || process.argv.includes('build');

const runMigrate = async () => {
  // Skip migrations if in build environment or POSTGRES_URL is not defined
  if (isBuildEnvironment || !process.env.POSTGRES_URL) {
    console.log('⚠️ Skipping migrations in build environment or POSTGRES_URL is not defined');
    return;
  }

  try {
    const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
    const db = drizzle(connection);

    console.log('⏳ Running migrations...');

    const start = Date.now();
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    const end = Date.now();

    console.log('✅ Migrations completed in', end - start, 'ms');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed');
    console.error(error);
    // Don't exit with error code during build
    if (!isBuildEnvironment) {
      process.exit(1);
    }
  }
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  // Don't exit with error code during build
  if (!isBuildEnvironment) {
    process.exit(1);
  }
});
