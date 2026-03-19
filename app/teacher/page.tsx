"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type DashboardCounts = {
  quizzes: number;
  questions: number;
  worksheets: number;
  readings: number;
};

type QuickLinkCardProps = {
  title: string;
  description: string;
  href: string;
};

function QuickLinkCard({ title, description, href }: QuickLinkCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-black bg-yellow-50 p-5 transition hover:-translate-y-0.5 hover:bg-yellow-200"
    >
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm opacity-80">{description}</p>
      <div className="mt-4 inline-flex rounded-lg border border-black bg-black px-3 py-2 text-sm font-bold text-yellow-300">
        Open →
      </div>
    </Link>
  );
}

export default function TeacherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<DashboardCounts>({
    quizzes: 0,
    questions: 0,
    worksheets: 0,
    readings: 0,
  });

  useEffect(() => {
    let mounted = true;

    const checkTeacherAndLoad = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const userId = session?.user?.id;

        if (!userId) {
          router.replace("/login");
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (error || !profile) {
          router.replace("/login");
          return;
        }

        const role = String(profile.role || "student").toLowerCase();

        if (role !== "teacher" && role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        const [quizzesRes, questionsRes, worksheetsRes, readingsRes] = await Promise.all([
          supabase.from("quizzes").select("*", { count: "exact", head: true }),
          supabase.from("questions").select("*", { count: "exact", head: true }),
          supabase.from("worksheets").select("*", { count: "exact", head: true }),
          supabase.from("reading_texts").select("*", { count: "exact", head: true }),
        ]);

        if (!mounted) return;

        setCounts({
          quizzes: quizzesRes.count || 0,
          questions: questionsRes.count || 0,
          worksheets: worksheetsRes.count || 0,
          readings: readingsRes.count || 0,
        });

        setLoading(false);
      } catch {
        router.replace("/login");
      }
    };

    checkTeacherAndLoad();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-300 flex items-center justify-center p-6">
        <div className="border border-black rounded-2xl bg-yellow-100 px-8 py-6 text-xl font-bold">
          Loading teacher panel...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <section className="rounded-3xl border border-black bg-yellow-100 p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.2em] opacity-70 mb-3">
            English Time
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold">Teacher Dashboard</h1>
          <p className="mt-3 text-sm md:text-base opacity-80 max-w-3xl">
            Manage quizzes, questions, worksheets, reading texts, and student performance tools.
          </p>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-black bg-yellow-100 p-5">
            <div className="text-xs opacity-70">Quizzes</div>
            <div className="mt-2 text-3xl font-extrabold">{counts.quizzes}</div>
          </div>

          <div className="rounded-2xl border border-black bg-yellow-100 p-5">
            <div className="text-xs opacity-70">Questions</div>
            <div className="mt-2 text-3xl font-extrabold">{counts.questions}</div>
          </div>

          <div className="rounded-2xl border border-black bg-yellow-100 p-5">
            <div className="text-xs opacity-70">Worksheets</div>
            <div className="mt-2 text-3xl font-extrabold">{counts.worksheets}</div>
          </div>

          <div className="rounded-2xl border border-black bg-yellow-100 p-5">
            <div className="text-xs opacity-70">Reading Texts</div>
            <div className="mt-2 text-3xl font-extrabold">{counts.readings}</div>
          </div>
        </section>

        <section className="rounded-3xl border border-black bg-yellow-100 p-6">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Teacher Shortcuts</h2>
            <p className="text-sm opacity-80 mt-1">
              Quickly open the sections you will use most often.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <QuickLinkCard
              title="Quizzes"
              description="Create quizzes and manage level/class-based tests."
              href="/teacher/quizzes"
            />

            <QuickLinkCard
              title="Questions"
              description="Add and manage quiz questions and answer options."
              href="/teacher/questions"
            />

            <QuickLinkCard
              title="Worksheets"
              description="Upload and organize worksheet PDFs."
              href="/teacher/worksheets"
            />

            <QuickLinkCard
              title="Reading Texts"
              description="Manage reading passages for different levels."
              href="/teacher/reading-texts"
            />

            <QuickLinkCard
              title="Leaderboard"
              description="Review class rankings and course performance."
              href="/teacher/leaderboard"
            />

            <QuickLinkCard
              title="Quiz Insights"
              description="See the most missed questions and student mistake details."
              href="/teacher/quiz-insights"
            />

            <QuickLinkCard
              title="Tools"
              description="Open teacher tools and analytics shortcuts."
              href="/teacher/tools"
            />
          </div>
        </section>
      </main>
    </div>
  );
}