import { pool } from './db';
import * as fs from 'fs';
import * as path from 'path';

const runMigration = async () => {
  try {
    const migrationPath = path.join(__dirname, 'migration-add-tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Running migration-add-tables.sql...');
    
    await pool.query(migrationSQL);
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
