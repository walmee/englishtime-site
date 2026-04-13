"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type ResultRow = {
  student_id: string;
  quiz_id: number;
  score: number;
  created_at?: string | null;
};

type QuizMeta = {
  id: number;
  title: string;
  unit: string | null;
};

type NoticeTone = "error" | "info";

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [checkingRole, setCheckingRole] = useState(true);
  const [userId, setUserId] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileLevel, setProfileLevel] = useState("");
  const [results, setResults] = useState<ResultRow[] | undefined>([]);
  const [quizMap, setQuizMap] = useState<Record<number, QuizMeta>>({});
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<NoticeTone>("info");

  const safeResults: ResultRow[] = Array.isArray(results) ? results : [];

  const getNoticeStyles = (tone: NoticeTone) => {
    if (tone === "error") {
      return {
        wrapper: "bg-red-50 border-red-200 text-red-900",
        title: "Issue",
      };
    }

    return {
      wrapper: "bg-sky-50 border-sky-200 text-sky-900",
      title: "Info",
    };
  };

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username, level, role")
        .eq("id", user.id)
        .single();

      if (!mounted) return;

      if (error || !profile) {
        router.replace("/login");
        return;
      }

      const role = String(profile.role || "student").toLowerCase();

      if (role === "teacher") {
        router.replace("/teacher");
        return;
      }

      if (role === "admin") {
        router.replace("/admin");
        return;
      }

      const username = profile.username || user.email || "Student";

      setUserId(user.id);
      setProfileName(username);
      setProfileLevel(profile.level || "A1");
      setCheckingRole(false);
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  const loadQuizMeta = async (rows: ResultRow[]) => {
    const quizIds = [...new Set(rows.map((r) => Number(r.quiz_id)).filter(Boolean))];

    if (quizIds.length === 0) {
      setQuizMap({});
      return;
    }

    const { data, error } = await supabase
      .from("quizzes")
      .select("id, title, unit")
      .in("id", quizIds);

    if (error || !Array.isArray(data)) {
      setQuizMap({});
      return;
    }

    const map: Record<number, QuizMeta> = {};
    for (const item of data as QuizMeta[]) {
      map[item.id] = item;
    }
    setQuizMap(map);
  };

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setNotice("");
      setNoticeTone("info");

      const { data, error } = await supabase
        .from("leaderboard")
        .select("student_id, quiz_id, score, created_at")
        .eq("student_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (cancelled) return;

      if (error) {
        if (!error.message.toLowerCase().includes("abort")) {
          setNotice(error.message);
          setNoticeTone("error");
        }
        setResults([]);
        setQuizMap({});
        setLoading(false);
        return;
      }

      const rows = Array.isArray(data) ? (data as ResultRow[]) : [];
      setResults(rows);
      await loadQuizMeta(rows);

      if (!cancelled) {
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const testsCompleted = safeResults.length;

  const avgScore = useMemo(() => {
    if (!safeResults.length) return 0;
    const total = safeResults.reduce((acc, r) => acc + (Number(r.score) || 0), 0);
    return Math.round(total / safeResults.length);
  }, [safeResults]);

  const bestScore = useMemo(() => {
    if (!safeResults.length) return 0;
    return Math.max(...safeResults.map((r) => Number(r.score) || 0));
  }, [safeResults]);

  const latestScore = useMemo(() => {
    if (!safeResults.length) return 0;
    return Number(safeResults[0]?.score || 0);
  }, [safeResults]);

  const strongPerformanceCount = useMemo(() => {
    return safeResults.filter((r) => Number(r.score || 0) >= 75).length;
  }, [safeResults]);

  const refresh = async () => {
    if (!userId) return;

    setLoading(true);
    setNotice("");
    setNoticeTone("info");

    const { data, error } = await supabase
      .from("leaderboard")
      .select("student_id, quiz_id, score, created_at")
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      if (!error.message.toLowerCase().includes("abort")) {
        setNotice(error.message);
        setNoticeTone("error");
      }
      setResults([]);
      setQuizMap({});
      setLoading(false);
      return;
    }

    const rows = Array.isArray(data) ? (data as ResultRow[]) : [];
    setResults(rows);
    await loadQuizMeta(rows);
    setLoading(false);
  };

  const getQuizLabel = (quizId: number) => {
    const quiz = quizMap[quizId];
    if (!quiz) return "Quiz";
    if (quiz.unit && quiz.title) return `${quiz.unit} • ${quiz.title}`;
    return quiz.title || quiz.unit || "Quiz";
  };

  const getScoreTone = (score: number) => {
    if (score >= 90) {
      return {
        badge: "bg-emerald-50 text-emerald-900 border-emerald-200",
        label: "Excellent",
      };
    }
    if (score >= 75) {
      return {
        badge: "bg-amber-50 text-amber-900 border-amber-200",
        label: "Good",
      };
    }
    return {
      badge: "bg-red-50 text-red-900 border-red-200",
      label: "Needs Practice",
    };
  };

  const getLearningMessage = () => {
    if (!safeResults.length) {
      return "You have not completed a test yet. Start with a new test and begin building your progress.";
    }
    if (avgScore >= 90) {
      return "Your recent results look very strong. Keep your momentum and challenge yourself with more tests.";
    }
    if (avgScore >= 75) {
      return "You are progressing well. A few more focused practice sessions can push your average even higher.";
    }
    return "You have started building your history. Review mistakes carefully and use worksheets and writing tasks to improve.";
  };

  if (checkingRole) {
    return (
      <div
        className="min-h-screen w-full overflow-x-hidden flex items-center justify-center"
        style={{ backgroundColor: "#f5f5f5", color: "#111111" }}
      >
        <div className="rounded-3xl border bg-white p-8 shadow-sm font-bold">
          Loading dashboard...
        </div>
      </div>
    );
  }

  const noticeStyles = getNoticeStyles(noticeTone);

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ backgroundColor: "#f5f5f5", color: "#111111" }}
    >
      <main className="w-full px-3 py-6 md:max-w-7xl md:mx-auto overflow-x-hidden space-y-6">
        <section className="rounded-[28px] border bg-white p-6 md:p-8 shadow-sm">
          <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.85fr] gap-6 items-stretch">
            <div className="space-y-5">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] opacity-50 mb-3">
                  Student Dashboard
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold leading-tight break-words">
                  Welcome back, {profileName}!
                </h1>
                <p className="text-sm md:text-base opacity-75 mt-3 max-w-2xl leading-6">
                  Review your progress, continue with a new test, and keep improving through
                  worksheets, writing, and mistake review.
                </p>
              </div>

              {notice ? (
                <div className={`border rounded-2xl p-4 ${noticeStyles.wrapper}`}>
                  <p className="font-bold">{noticeStyles.title}</p>
                  <p className="text-sm break-words">{notice}</p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border bg-neutral-50 p-4">
                  <div className="text-xs opacity-60">Current Level</div>
                  <div className="text-2xl font-extrabold mt-1">
                    {loading ? "..." : profileLevel}
                  </div>
                </div>

                <div className="rounded-2xl border bg-neutral-50 p-4">
                  <div className="text-xs opacity-60">Tests Completed</div>
                  <div className="text-2xl font-extrabold mt-1">
                    {loading ? "..." : testsCompleted}
                  </div>
                </div>

                <div className="rounded-2xl border bg-neutral-50 p-4">
                  <div className="text-xs opacity-60">Average Score</div>
                  <div className="text-2xl font-extrabold mt-1">
                    {loading ? "..." : `${avgScore}%`}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border bg-neutral-50 p-5 md:p-6 flex flex-col justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] opacity-50 mb-2">
                  Learning Overview
                </div>
                <h2 className="text-xl font-bold mb-3">Your current snapshot</h2>
                <p className="text-sm opacity-75 leading-6">{getLearningMessage()}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="rounded-2xl border bg-white p-4">
                  <div className="text-xs opacity-60">Best Score</div>
                  <div className="text-2xl font-extrabold mt-1">
                    {loading ? "..." : `${bestScore}%`}
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <div className="text-xs opacity-60">Latest Score</div>
                  <div className="text-2xl font-extrabold mt-1">
                    {loading ? "..." : `${latestScore}%`}
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-4 col-span-2">
                  <div className="text-xs opacity-60">Strong Results</div>
                  <div className="text-2xl font-extrabold mt-1">
                    {loading ? "..." : strongPerformanceCount}
                  </div>
                  <div className="text-sm opacity-70 mt-1">
                    quizzes with 75% or above
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
          <div className="rounded-[28px] border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] opacity-50 mb-2">
                  Quick Actions
                </div>
                <h2 className="text-2xl font-bold">Continue your learning</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/take-test"
                className="rounded-3xl border p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
                style={{ backgroundColor: "#ffffff", borderColor: "#e5e5e5" }}
              >
                <div className="text-xs uppercase tracking-[0.14em] opacity-50 mb-2">
                  Action
                </div>
                <div className="text-xl font-bold">Take a Test</div>
                <p className="text-sm opacity-75 mt-2 leading-6">
                  Open the test browser, choose a quiz, and see your result instantly after
                  submission.
                </p>
                <div className="mt-5 inline-flex px-4 py-2 rounded-xl border font-bold bg-yellow-300">
                  Start Now →
                </div>
              </Link>

              <Link
                href="/history"
                className="rounded-3xl border p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
                style={{ backgroundColor: "#ffffff", borderColor: "#e5e5e5" }}
              >
                <div className="text-xs uppercase tracking-[0.14em] opacity-50 mb-2">
                  Review
                </div>
                <div className="text-xl font-bold">Study Your Mistakes</div>
                <p className="text-sm opacity-75 mt-2 leading-6">
                  Revisit previous attempts, check the questions you missed, and focus on weak
                  areas.
                </p>
                <div className="mt-5 inline-flex px-4 py-2 rounded-xl border font-bold bg-neutral-50">
                  Open History →
                </div>
              </Link>

              <Link
                href="/worksheets"
                className="rounded-3xl border p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
                style={{ backgroundColor: "#ffffff", borderColor: "#e5e5e5" }}
              >
                <div className="text-xs uppercase tracking-[0.14em] opacity-50 mb-2">
                  Practice
                </div>
                <div className="text-xl font-bold">Worksheets</div>
                <p className="text-sm opacity-75 mt-2 leading-6">
                  Open the worksheets prepared for your class and continue extra practice outside
                  the quiz flow.
                </p>
                <div className="mt-5 inline-flex px-4 py-2 rounded-xl border font-bold bg-neutral-50">
                  View Worksheets →
                </div>
              </Link>

              <Link
                href="/writing"
                className="rounded-3xl border p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
                style={{ backgroundColor: "#ffffff", borderColor: "#e5e5e5" }}
              >
                <div className="text-xs uppercase tracking-[0.14em] opacity-50 mb-2">
                  Writing
                </div>
                <div className="text-xl font-bold">Writing Tasks</div>
                <p className="text-sm opacity-75 mt-2 leading-6">
                  Submit your writing assignments and review teacher scores and feedback in one
                  place.
                </p>
                <div className="mt-5 inline-flex px-4 py-2 rounded-xl border font-bold bg-neutral-50">
                  Open Writing →
                </div>
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] opacity-50 mb-2">
                  Progress Feed
                </div>
                <h2 className="text-2xl font-bold">Recent Tests</h2>
              </div>

              <button
                onClick={refresh}
                className="px-4 py-2 rounded-xl border font-bold transition hover:bg-neutral-100"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-dashed p-8 text-center bg-neutral-50">
                Loading recent tests...
              </div>
            ) : safeResults.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center bg-neutral-50">
                <p className="font-semibold">No tests completed yet</p>
                <p className="text-sm mt-2 opacity-70">
                  Start your first test to see your progress here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {safeResults.slice(0, 5).map((r, index) => {
                  const score = Number(r.score || 0);
                  const scoreTone = getScoreTone(score);

                  return (
                    <div
                      key={`${r.student_id}-${r.quiz_id}-${index}`}
                      className="rounded-2xl border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                      style={{ backgroundColor: "#ffffff", borderColor: "#e5e5e5" }}
                    >
                      <div className="min-w-0">
                        <div className="text-xs opacity-50 mb-1">Recent Attempt</div>
                        <p className="font-bold break-words">{getQuizLabel(r.quiz_id)}</p>
                        <p className="text-sm opacity-75 mt-1">Score: {score}%</p>
                        <p className="text-xs opacity-60 mt-1 break-words">
                          {r.created_at ? new Date(r.created_at).toLocaleString() : "No date"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center shrink-0">
                        <span className={`text-xs px-3 py-1 rounded-xl border font-bold ${scoreTone.badge}`}>
                          {scoreTone.label}
                        </span>
                        <span className="text-xs px-3 py-1 rounded-xl border bg-neutral-50">
                          Completed
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="rounded-[28px] border bg-white p-6 shadow-sm">
            <div className="text-xs uppercase tracking-[0.16em] opacity-50 mb-2">
              Momentum
            </div>
            <h2 className="text-2xl font-bold mb-4">Performance Summary</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-xs opacity-60">Latest score</div>
                <div className="text-2xl font-extrabold mt-1">{latestScore}%</div>
                <div className="text-sm opacity-70 mt-1">most recent saved result</div>
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-xs opacity-60">Best score</div>
                <div className="text-2xl font-extrabold mt-1">{bestScore}%</div>
                <div className="text-sm opacity-70 mt-1">highest recent achievement</div>
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-xs opacity-60">Average</div>
                <div className="text-2xl font-extrabold mt-1">{avgScore}%</div>
                <div className="text-sm opacity-70 mt-1">across recent tests</div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border bg-white p-6 shadow-sm">
            <div className="text-xs uppercase tracking-[0.16em] opacity-50 mb-2">
              Recommendation
            </div>
            <h2 className="text-2xl font-bold mb-3">Best next step</h2>
            <p className="text-sm opacity-75 leading-6">
              {testsCompleted === 0
                ? "Start with a test first. After that, use History to review your mistakes and build a better score pattern."
                : avgScore >= 85
                ? "Your results are already strong. The best next step is to keep testing regularly and reinforce your progress with writing tasks."
                : avgScore >= 70
                ? "You are on a good path. Review your recent mistakes and combine quiz practice with worksheets to push your average higher."
                : "Focus on consistency. Take another test, then spend time in History and Worksheets before moving to more advanced topics."}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/take-test"
                className="px-4 py-2 rounded-xl border font-bold"
                style={{ backgroundColor: "#facc15", color: "#111111", borderColor: "#111111" }}
              >
                Go to Tests
              </Link>

              <Link
                href="/leaderboard"
                className="px-4 py-2 rounded-xl border font-bold bg-white hover:bg-neutral-100 transition"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}