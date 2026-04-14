import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type HomeHighlightRow = {
  id: number;
  card_key: string;
  label: string;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

async function getHomeHighlights(): Promise<HomeHighlightRow[]> {
  if (!supabaseUrl || !supabaseAnonKey) return [];

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from("home_highlights")
    .select("id, card_key, label, title, description, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(3);

  if (error || !Array.isArray(data)) return [];

  return data as HomeHighlightRow[];
}

export default async function HomePage() {
  const highlights = await getHomeHighlights();

  const fallbackHighlights: HomeHighlightRow[] = [
    {
      id: 1,
      card_key: "today_1",
      label: "Announcement",
      title: "Speaking Club - Friday 19:30",
      description: "Please follow your teacher's instructions for participation.",
      sort_order: 1,
      is_active: true,
    },
    {
      id: 2,
      card_key: "today_2",
      label: "Word of the Day",
      title: "Improve",
      description: "To make something better.",
      sort_order: 2,
      is_active: true,
    },
    {
      id: 3,
      card_key: "today_3",
      label: "Reading of the Day",
      title: "B1 Reading Practice",
      description: "Open short reading texts prepared for your level.",
      sort_order: 3,
      is_active: true,
    },
  ];

  const todayCards = highlights.length > 0 ? highlights : fallbackHighlights;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
    >
      <main className="w-full px-4 py-8 md:max-w-6xl md:mx-auto space-y-8">
        <section className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-stretch">
          <div className="bg-[#101010] text-white rounded-3xl p-8 min-h-[360px] flex flex-col justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-yellow-300 mb-4">
                English Time
              </p>
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
                It&apos;s Time for
                <span className="text-yellow-300"> English!</span>
              </h1>
              <p className="mt-6 text-white/80 max-w-xl text-lg leading-8">
                Access daily words, level-based reading texts, speaking club
                announcements, and class content all in one place.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#daily-texts"
                className="rounded-full px-6 py-3 font-bold transition border border-black"
                style={{
                  backgroundColor: "var(--bg-button)",
                  color: "var(--text-main)",
                }}
              >
                Explore Daily Readings
              </a>
              <a
                href="/login"
                className="rounded-full border border-white/30 px-6 py-3 font-semibold hover:bg-white/10 transition"
              >
                Login
              </a>
            </div>
          </div>

          <div
            className="border border-black/15 rounded-3xl p-6 min-h-[360px]"
            style={{ backgroundColor: "var(--bg-card)" }}
          >
            <h2 className="text-2xl font-bold mb-4">What&apos;s Happening Today?</h2>

            <div className="space-y-4">
              {todayCards.map((item) => (
                <div
                  key={item.card_key}
                  className="rounded-2xl border border-black/10 p-4"
                  style={{ backgroundColor: "var(--bg-soft)" }}
                >
                  <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                    {item.label}
                  </p>
                  <p className="font-bold mt-1">{item.title}</p>
                  <p className="text-sm mt-2" style={{ color: "var(--text-soft)" }}>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="announcements"
          className="border border-black/15 rounded-3xl p-8"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <h2 className="text-3xl font-bold mb-4">Announcements</h2>
          <p className="mb-6" style={{ color: "var(--text-soft)" }}>
            Follow course and class announcements here.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div
              className="rounded-2xl border border-black/10 p-5"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <h3 className="font-bold">Speaking Club</h3>
              <p className="text-sm mt-2" style={{ color: "var(--text-soft)" }}>
                This week&apos;s speaking club activity will be held on Friday.
              </p>
            </div>

            <div
              className="rounded-2xl border border-black/10 p-5"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <h3 className="font-bold">Worksheet Submission</h3>
              <p className="text-sm mt-2" style={{ color: "var(--text-soft)" }}>
                Don&apos;t forget to check worksheet submission deadlines.
              </p>
            </div>

            <div
              className="rounded-2xl border border-black/10 p-5"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <h3 className="font-bold">Weekly Quiz</h3>
              <p className="text-sm mt-2" style={{ color: "var(--text-soft)" }}>
                Weekly quizzes will be available through the student panel.
              </p>
            </div>
          </div>
        </section>

        <section
          id="daily-words"
          className="border border-black/15 rounded-3xl p-8"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <h2 className="text-3xl font-bold mb-4">Words of the Day</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div
              className="rounded-2xl border border-black/10 p-5"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <p className="text-2xl font-bold">Improve</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>
                to make better
              </p>
              <p className="mt-3 text-sm">I want to improve my English.</p>
            </div>

            <div
              className="rounded-2xl border border-black/10 p-5"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <p className="text-2xl font-bold">Practice</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>
                to do again and again
              </p>
              <p className="mt-3 text-sm">You should practice every day.</p>
            </div>

            <div
              className="rounded-2xl border border-black/10 p-5"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <p className="text-2xl font-bold">Confident</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>
                feeling sure
              </p>
              <p className="mt-3 text-sm">She feels confident in speaking.</p>
            </div>
          </div>
        </section>

        <section
          id="daily-texts"
          className="border border-black/15 rounded-3xl p-8"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <h2 className="text-3xl font-bold mb-4">Daily Reading</h2>
          <p className="mb-6" style={{ color: "var(--text-soft)" }}>
            Open reading pages prepared for each level. Later, you can also add
            multiple-choice questions, true-false activities, and sequencing tasks
            under these readings.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
              <div
                key={level}
                className="rounded-2xl border border-black/10 p-5 hover:shadow-md hover:-translate-y-0.5 transition"
                style={{ backgroundColor: "var(--bg-soft)" }}
              >
                <p className="text-xl font-bold">{level}</p>
                <p className="text-sm mt-2" style={{ color: "var(--text-soft)" }}>
                  Open the reading page created for this level.
                </p>

                <Link
                  href={`/reading/${level.toLowerCase()}`}
                  className="mt-4 inline-block rounded-full px-4 py-2 text-sm font-bold border border-black transition"
                  style={{
                    backgroundColor: "var(--bg-button)",
                    color: "var(--text-main)",
                  }}
                >
                  Open Reading
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section
          id="activities"
          className="border border-black/15 rounded-3xl p-8"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <h2 className="text-3xl font-bold mb-4">Speaking Club & Classes</h2>
          <p className="mb-6" style={{ color: "var(--text-soft)" }}>
            You can add speaking club days, class details, and weekly activity cards
            here.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div
              className="rounded-2xl border border-black/10 p-5 min-h-[180px]"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <h3 className="font-bold text-lg">Speaking Club</h3>
              <p className="text-sm mt-3" style={{ color: "var(--text-soft)" }}>
                Friday - 19:30
              </p>
              <p className="text-sm mt-2" style={{ color: "var(--text-soft)" }}>
                For B1 / B2 students
              </p>
            </div>

            <div
              className="rounded-2xl border border-black/10 p-5 min-h-[180px]"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <h3 className="font-bold text-lg">California Class</h3>
              <p className="text-sm mt-3" style={{ color: "var(--text-soft)" }}>
                Special worksheets and quiz content for the B2 class
              </p>
            </div>

            <div
              className="rounded-2xl border border-black/10 p-5 min-h-[180px]"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <h3 className="font-bold text-lg">Weekly Event</h3>
              <p className="text-sm mt-3" style={{ color: "var(--text-soft)" }}>
                New reading and vocabulary activities every week
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}