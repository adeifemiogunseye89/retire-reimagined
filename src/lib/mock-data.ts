/**
 * Mock data for Reignite app demo.
 * Replace with real Supabase queries when backend is connected.
 */

export const mockUser = {
  id: "demo-user-1",
  fullName: "Mrs. Funke Adebanjo",
  age: 54,
  yearsInService: 28,
  gradeLevel: "GL 14",
  sector: "Teaching" as const,
  currentSalary: 320000,
  pensionProjection: 148000,
  skills: ["Biology", "Chemistry", "Curriculum Development", "Mentoring"],
  businessInterests: ["Online Tutoring", "Educational Products", "Teacher Training"],
};

export const mockReport = {
  readinessScore: 78,
  pensionGap: 172000,
  inflationNote: "At 15% annual inflation, your pension purchasing power drops 50% in 5 years.",
  topIdeas: [
    {
      id: "1",
      title: "AI-Assisted JAMB/SSCE Online Tutoring",
      description:
        "Leverage 28 years of Biology & Chemistry expertise to build a subscription-based tutoring platform. Use AI to auto-generate quizzes, mark scripts, and personalize student learning paths.",
      projectedIncome: 450000,
      status: "idea" as const,
    },
    {
      id: "2",
      title: "Home Science Kits E-Commerce",
      description:
        "Sell practical science experiment kits for secondary school students across Lagos. Partner with local suppliers, sell via Instagram & WhatsApp Business.",
      projectedIncome: 280000,
      status: "idea" as const,
    },
    {
      id: "3",
      title: "Virtual Teacher-Training Workshops",
      description:
        "Run premium webinars training private school teachers on modern pedagogy, lab management, and AI tools. Sell to school owners directly.",
      projectedIncome: 350000,
      status: "idea" as const,
    },
  ],
  nextSteps: [
    "Complete the digital skills assessment module",
    "Register for the upcoming LASPEC pre-retirement workshop",
    "Start building your tutoring content library",
    "Open a business savings account",
  ],
};

export const mockMetrics = {
  sideIncome: 85000,
  sideIncomeHistory: [
    { month: "Jan", amount: 0 },
    { month: "Feb", amount: 15000 },
    { month: "Mar", amount: 32000 },
    { month: "Apr", amount: 48000 },
    { month: "May", amount: 65000 },
    { month: "Jun", amount: 85000 },
  ],
  businessesLaunched: 1,
  studentsEnrolled: 24,
  anxietyScore: 35,
  anxietyHistory: [
    { month: "Jan", score: 72 },
    { month: "Feb", score: 65 },
    { month: "Mar", score: 55 },
    { month: "Apr", score: 48 },
    { month: "May", score: 40 },
    { month: "Jun", score: 35 },
  ],
};

export const mockEvents = [
  {
    id: "e1",
    title: "Pre-Retirement AI Business Planning Webinar",
    type: "webinar" as const,
    date: "2026-04-15T10:00:00",
    description: "Learn how to use AI tools to validate and launch your post-retirement business idea.",
    sector: ["Teaching", "Health"],
  },
  {
    id: "e2",
    title: "LASPEC Pension Documentation Workshop",
    type: "workshop" as const,
    date: "2026-04-22T09:00:00",
    description: "Get your pension paperwork in order. Bring all original certificates.",
    sector: ["Teaching", "Local Government", "Health"],
  },
  {
    id: "e3",
    title: "Digital Skills for Retiring Teachers",
    type: "training" as const,
    date: "2026-05-05T14:00:00",
    description: "Hands-on training: Google Classroom, Canva, and AI content creation.",
    sector: ["Teaching"],
  },
];
