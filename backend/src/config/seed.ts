import { query, pool } from "./db";
import {
  SHOWCASE_SEED_COURSES,
  curriculumVideoLinksForShowcase,
  showcaseIntroFor,
} from "./showcaseCoursesSeedData";

const seed = async () => {
  const instructorResult = await query(
    `SELECT id FROM users WHERE role IN ('instructor', 'admin')
     ORDER BY CASE WHEN role = 'instructor' THEN 0 ELSE 1 END
     LIMIT 1`,
  );
  const instructorId = instructorResult.rows[0]?.id as number | undefined;

  if (instructorId) {
    let showcaseInserted = 0;
    for (const c of SHOWCASE_SEED_COURSES) {
      const exists = await query("SELECT 1 FROM courses WHERE title = $1", [
        c.title,
      ]);
      if (exists.rows.length > 0) continue;
      const intro = showcaseIntroFor(c.title);
      const curriculum = curriculumVideoLinksForShowcase(c.title);
      await query(
        `INSERT INTO courses (
          title, description, thumbnail, intro_video_url, intro_video_title, instructor_id, category, difficulty, price,
          is_published, video_links, total_videos, duration, enrolled_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10::jsonb, $11, $12, $13)`,
        [
          c.title,
          c.description,
          c.thumbnail,
          intro.url,
          intro.title,
          instructorId,
          c.category,
          c.difficulty,
          c.price,
          JSON.stringify(curriculum),
          curriculum.length,
          c.duration,
          c.enrolledCount,
        ],
      );
      showcaseInserted += 1;
    }
    if (showcaseInserted > 0) {
      console.log(
        `Seeded ${showcaseInserted} showcase course(s) (edit in Admin → Manage Courses).`,
      );
    } else {
      console.log("Showcase courses already present (skipped).");
    }
  } else {
    console.warn(
      "No instructor or admin user in the database — skipped showcase courses. Sign in with Google, promote a user to instructor/admin if needed, then run db:seed again.",
    );
  }

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
