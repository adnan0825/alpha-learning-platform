/**
 * Landing-page showcase courses — inserted by `npm run db:seed` (idempotent by title).
 * Edit these in Admin → Manage Courses after seeding.
 */
export type ShowcaseSeedCourse = {
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  duration: string;
  totalVideos: number;
  enrolledCount: number;
  thumbnail: string;
};

const DEMO_INTRO_URL = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
const DEMO_LESSON_A = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const DEMO_LESSON_B = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

/** Dedicated public intro row in DB (free preview); curriculum is separate in `video_links`. */
export function showcaseIntroFor(courseTitle: string) {
  return {
    url: DEMO_INTRO_URL,
    title: `Introduction — ${courseTitle}`,
  };
}

/** Curriculum lessons only (intro is stored in `intro_video_url`). */
export function curriculumVideoLinksForShowcase(courseTitle: string) {
  return [
    { title: `${courseTitle}: Part 1`, url: DEMO_LESSON_A, duration: '25m' },
    { title: `${courseTitle}: Part 2`, url: DEMO_LESSON_B, duration: '35m' },
  ];
}

export const SHOWCASE_SEED_COURSES: ShowcaseSeedCourse[] = [
  {
    title: 'React Native App Development',
    description:
      'Build cross-platform mobile apps with React Native. Components, navigation, and publishing to app stores.',
    category: 'App Dev',
    difficulty: 'intermediate',
    price: 6000,
    duration: '08h 30m',
    totalVideos: 2,
    enrolledCount: 12,
    thumbnail:
      'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&w=800&q=80',
  },
  {
    title: 'Full-Stack Web Development',
    description:
      'Modern web apps with front-end frameworks, APIs, databases, and deployment — from zero to production.',
    category: 'Web Dev',
    difficulty: 'intermediate',
    price: 8000,
    duration: '12h 45m',
    totalVideos: 2,
    enrolledCount: 25,
    thumbnail:
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&w=800&q=80',
  },
  {
    title: 'Python Programming Basics',
    description:
      'Learn Python syntax, data structures, files, and small projects — a solid base for automation and data work.',
    category: 'Programming',
    difficulty: 'beginner',
    price: 5000,
    duration: '06h 15m',
    totalVideos: 2,
    enrolledCount: 18,
    thumbnail:
      'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&w=800&q=80',
  },
  {
    title: 'Digital Marketing Mastery',
    description:
      'SEO, social ads, analytics, and funnels — grow audiences and convert leads for real businesses.',
    category: 'Marketing',
    difficulty: 'beginner',
    price: 5000,
    duration: '05h 20m',
    totalVideos: 2,
    enrolledCount: 34,
    thumbnail:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&w=800&q=80',
  },
  {
    title: 'AI Fundamentals with Python',
    description:
      'Introduction to machine learning concepts and practical notebooks using Python ecosystems.',
    category: 'AI/ML',
    difficulty: 'intermediate',
    price: 7000,
    duration: '09h 10m',
    totalVideos: 2,
    enrolledCount: 13,
    thumbnail:
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&w=800&q=80',
  },
  {
    title: 'Computer Basics Course',
    description:
      'Operating systems, files, browsers, email, and staying safe online — confidence with everyday technology.',
    category: 'Basics',
    difficulty: 'beginner',
    price: 4000,
    duration: '04h 00m',
    totalVideos: 2,
    enrolledCount: 14,
    thumbnail:
      'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&w=800&q=80',
  },
  {
    title: 'Graphic Design & Video Editing',
    description:
      'Visual design principles, tools, and editing workflows for social content and branding.',
    category: 'Design & Editing',
    difficulty: 'beginner',
    price: 5500,
    duration: '07h 30m',
    totalVideos: 2,
    enrolledCount: 16,
    thumbnail:
      'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&w=800&q=80',
  },
  {
    title: 'Upwork Mastery',
    description:
      'Profiles, proposals, client communication, and building a sustainable freelance practice.',
    category: 'Freelancing',
    difficulty: 'intermediate',
    price: 6500,
    duration: '06h 45m',
    totalVideos: 2,
    enrolledCount: 21,
    thumbnail:
      'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&w=800&q=80',
  },
  // Programming & Development
  {
    title: 'JavaScript Mastery',
    description:
      'Master JavaScript from fundamentals to advanced concepts including ES6+, async/await, DOM manipulation, and real-world projects.',
    category: 'Programming',
    difficulty: 'intermediate',
    price: 7000,
    duration: '10h 30m',
    totalVideos: 2,
    enrolledCount: 30,
    thumbnail:
      'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?auto=format&w=800&q=80',
  },
  {
    title: 'PHP Programming',
    description:
      'Complete PHP course covering syntax, OOP, database integration, security, and building dynamic web applications.',
    category: 'Programming',
    difficulty: 'beginner',
    price: 5500,
    duration: '08h 15m',
    totalVideos: 2,
    enrolledCount: 22,
    thumbnail:
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&w=800&q=80',
  },
  {
    title: 'C++ Programming',
    description:
      'Learn C++ from basics to advanced topics including memory management, OOP, data structures, and competitive programming.',
    category: 'Programming',
    difficulty: 'intermediate',
    price: 6500,
    duration: '11h 00m',
    totalVideos: 2,
    enrolledCount: 18,
    thumbnail:
      'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&w=800&q=80',
  },
  {
    title: 'Git & GitHub (Version Control System)',
    description:
      'Master version control with Git branching, merging, collaboration workflows, and GitHub features for team development.',
    category: 'Development Tools',
    difficulty: 'beginner',
    price: 4000,
    duration: '05h 30m',
    totalVideos: 2,
    enrolledCount: 35,
    thumbnail:
      'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&w=800&q=80',
  },
  {
    title: 'Backend Web Development (PHP & MySQL)',
    description:
      'Build robust server-side applications with PHP and MySQL covering databases, APIs, authentication, and deployment.',
    category: 'Web Dev',
    difficulty: 'intermediate',
    price: 7500,
    duration: '09h 45m',
    totalVideos: 2,
    enrolledCount: 20,
    thumbnail:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&w=800&q=80',
  },
  // Web Development (Specific Tracks)
  {
    title: 'Full Stack Web Development with WordPress',
    description:
      'Complete WordPress course covering themes, plugins, custom post types, WooCommerce, and full-site development.',
    category: 'Web Dev',
    difficulty: 'intermediate',
    price: 7000,
    duration: '10h 00m',
    totalVideos: 2,
    enrolledCount: 28,
    thumbnail:
      'https://images.unsplash.com/photo-1563203369-26f2e4a5ccf7?auto=format&w=800&q=80',
  },
  {
    title: 'Frontend Website Development',
    description:
      'Beginner-friendly course covering HTML, CSS, JavaScript, responsive design, and building beautiful websites from scratch.',
    category: 'Web Dev',
    difficulty: 'beginner',
    price: 5000,
    duration: '07h 30m',
    totalVideos: 2,
    enrolledCount: 32,
    thumbnail:
      'https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&w=800&q=80',
  },
  // Design & Editing
  {
    title: 'Canva Design – All in One',
    description:
      'Master Canva for creating professional graphics, social media posts, presentations, posters, and marketing materials.',
    category: 'Design & Editing',
    difficulty: 'beginner',
    price: 4500,
    duration: '06h 00m',
    totalVideos: 2,
    enrolledCount: 40,
    thumbnail:
      'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&w=800&q=80',
  },
  {
    title: 'Professional Video Editing',
    description:
      'Advanced video editing techniques, transitions, color grading, effects, and professional workflows for content creators.',
    category: 'Design & Editing',
    difficulty: 'advanced',
    price: 7500,
    duration: '09h 30m',
    totalVideos: 2,
    enrolledCount: 25,
    thumbnail:
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&w=800&q=80',
  },
  {
    title: 'Smartphone Video & Photo Editing',
    description:
      'Edit professional-quality videos and photos using smartphone apps — perfect for social media and content creators.',
    category: 'Design & Editing',
    difficulty: 'beginner',
    price: 4000,
    duration: '05h 15m',
    totalVideos: 2,
    enrolledCount: 38,
    thumbnail:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&w=800&q=80',
  },
  // Online Income / Business
  {
    title: 'YouTube Automation',
    description:
      'Build automated YouTube channels with content strategies, outsourcing, monetization, and passive income systems.',
    category: 'Online Business',
    difficulty: 'intermediate',
    price: 8000,
    duration: '10h 45m',
    totalVideos: 2,
    enrolledCount: 45,
    thumbnail:
      'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&w=800&q=80',
  },
];
