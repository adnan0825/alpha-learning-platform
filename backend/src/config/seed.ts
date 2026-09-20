import { query, pool } from "./db";

const seed = async () => {
  console.log("Course seed skipped. Courses are created by users.");

  console.log("Seed completed.");
  await pool.end();
  process.exit(0);
};

seed().catch((err: { code?: string; message?: string }) => {
  console.error(err);
  if (err?.code === "ECONNREFUSED") {
    console.error(
      "\nCannot reach PostgreSQL. Please ensure:\n" +
        "  1. PostgreSQL is installed and running\n" +
        "  2. PostgreSQL is listening on the configured host/port\n" +
        "  3. Database credentials in .env are correct\n" +
        "  4. Database exists (run: npm run db:setup)\n\n" +
        "If you need to set up the database, run:\n" +
        "  npm run db:setup    # Create database\n" +
        "  npm run db:schema   # Create tables\n" +
        "  npm run db:seed     # Add initial data\n",
    );
  }
  process.exit(1);
});
