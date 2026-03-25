"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type TeacherClassRow = {
  class_id: number;
  classes: {
    id: number;
    class_name: string;
    level: string;
  } | null;
};

type AssignedClass = {
  id: number;
  class_name: string;
  level: string;
};

type DashboardStats = {
  assignedClasses: number;
  quizzes: number;
  worksheets: number;
  readings: number;
};

export default function TeacherPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    assignedClasses: 0,
    quizzes: 0,
    worksheets: 0,
    readings: 0,
  });
  const [message, setMessage] = useState("");

  const classNamesText = useMemo(() => {
    if (assignedClasses.length === 0) return "No classes assigned yet";
    return assignedClasses.map((c) => c.class_name).join(", ");
  }, [assignedClasses]);

  useEffect(() => {
    let mounted = true;

    const loadTeacherDashboard = async () => {
      try {
        setLoading(true);
        setMessage("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const userId = session?.user?.id;
        if (!userId) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("username, role")
          .eq("id", userId)
          .single();

        if (profileError || !profile) {
          router.replace("/login");
          return;
        }

        const role = String(profile.role || "").toLowerCase();
        if (role !== "teacher" && role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        const { data: teacherClassData, error: teacherClassError } = await supabase
          .from("teacher_classes")
          .select(
            `
            class_id,
            classes (
              id,
              class_name,
              level
            )
          `
          )
          .eq("teacher_id", userId);

        if (teacherClassError) {
          setMessage(teacherClassError.message);
        }

        const classList: AssignedClass[] = (teacherClassData ?? [])
          .map((row: any) => row.classes)
          .filter(Boolean)
          .map((cls: any) => ({
            id: cls.id,
            class_name: cls.class_name,
            level: cls.level,
          }));

        const classNames = classList.map((c) => c.class_name);

        const [quizzesRes, worksheetsRes, readingsRes] = await Promise.all([
          classNames.length > 0
            ? supabase
                .from("quizzes")
                .select("*", { count: "exact", head: true })
                .in("class_name", classNames)
            : supabase.from("quizzes").select("*", { count: "exact", head: true }).eq("id", -1),
          classList.length > 0
            ? supabase
                .from("worksheets")
                .select("*", { count: "exact", head: true })
                .in(
                  "class_id",
                  classList.map((c) => c.id)
                )
            : supabase
                .from("worksheets")
                .select("*", { count: "exact", head: true })
                .eq("id", -1),
          supabase.from("reading_texts").select("*", { count: "exact", head: true }),
        ]);

        if (!mounted) return;

        setUsername(profile.username || "Teacher");
        setAssignedClasses(classList);
        setStats({
          assignedClasses: classList.length,
          quizzes: quizzesRes.count || 0,
          worksheets: worksheetsRes.count || 0,
          readings: readingsRes.count || 0,
        });
      } catch (e: any) {
        if (!mounted) return;
        setMessage(e?.message || "Unexpected error.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadTeacherDashboard();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-300 text-black flex items-center justify-center p-6">
        <div className="bg-yellow-100 border border-black rounded-2xl px-8 py-6 text-xl font-bold">
          Loading teacher dashboard...
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
          <h1 className="text-3xl md:text-4xl font-extrabold">
            Welcome back, {username}!
          </h1>
          <p className="mt-3 text-sm md:text-base opacity-80 max-w-3xl">
            Manage your assigned classes, worksheets, quizzes, and classroom content from one place.
          </p>

          <div className="mt-5 rounded-2xl border border-black bg-yellow-50 p-4">
            <div className="text-xs opacity-70">Assigned class summary</div>
            <div className="mt-1 font-bold">{classNamesText}</div>
          </div>
        </section>

        {message ? (
          <div className="bg-yellow-50 border border-black rounded-xl p-4">
            {message}
          </div>
        ) : null}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-black bg-yellow-100 p-5">
            <div className="text-xs opacity-70">Assigned Classes</div>
            <div className="mt-2 text-3xl font-extrabold">{stats.assignedClasses}</div>
          </div>

          <div className="rounded-2xl border border-black bg-yellow-100 p-5">
            <div className="text-xs opacity-70">My Class Quizzes</div>
            <div className="mt-2 text-3xl font-extrabold">{stats.quizzes}</div>
          </div>

          <div className="rounded-2xl border border-black bg-yellow-100 p-5">
            <div className="text-xs opacity-70">My Class Worksheets</div>
            <div className="mt-2 text-3xl font-extrabold">{stats.worksheets}</div>
          </div>

          <div className="rounded-2xl border border-black bg-yellow-100 p-5">
            <div className="text-xs opacity-70">Reading Texts</div>
            <div className="mt-2 text-3xl font-extrabold">{stats.readings}</div>
          </div>
        </section>

        <section className="rounded-3xl border border-black bg-yellow-100 p-6">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">My Classes</h2>
            <p className="text-sm opacity-80 mt-1">
              These are the classes currently assigned to you.
            </p>
          </div>

          {assignedClasses.length === 0 ? (
            <div className="border border-dashed border-black rounded-lg p-6 text-center bg-yellow-50">
              No classes assigned yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {assignedClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="rounded-2xl border border-black bg-yellow-50 p-5"
                >
                  <div className="text-xs opacity-70">Class</div>
                  <div className="text-xl font-extrabold mt-1">{cls.class_name}</div>
                  <div className="mt-2 text-sm opacity-80">Level: {cls.level}</div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href="/teacher/worksheets"
                      className="px-3 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition font-bold text-sm"
                    >
                      Worksheets
                    </Link>
                    <Link
                      href="/teacher/quizzes"
                      className="px-3 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition font-bold text-sm"
                    >
                      Quizzes
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-black bg-yellow-100 p-6">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Quick Actions</h2>
            <p className="text-sm opacity-80 mt-1">
              Open the sections you use most often.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Link
              href="/teacher/quizzes"
              className="block rounded-2xl border border-black bg-yellow-50 p-5 transition hover:-translate-y-0.5 hover:bg-yellow-200"
            >
              <h3 className="text-lg font-bold">Quizzes</h3>
              <p className="mt-2 text-sm opacity-80">
                Create and manage quizzes for your classes.
              </p>
            </Link>

            <Link
              href="/teacher/questions"
              className="block rounded-2xl border border-black bg-yellow-50 p-5 transition hover:-translate-y-0.5 hover:bg-yellow-200"
            >
              <h3 className="text-lg font-bold">Questions</h3>
              <p className="mt-2 text-sm opacity-80">
                Organize and manage quiz questions more easily.
              </p>
            </Link>

            <Link
              href="/teacher/worksheets"
              className="block rounded-2xl border border-black bg-yellow-50 p-5 transition hover:-translate-y-0.5 hover:bg-yellow-200"
            >
              <h3 className="text-lg font-bold">Worksheets</h3>
              <p className="mt-2 text-sm opacity-80">
                Upload, edit, and review worksheets for assigned classes.
              </p>
            </Link>

            <Link
              href="/teacher/reading-texts"
              className="block rounded-2xl border border-black bg-yellow-50 p-5 transition hover:-translate-y-0.5 hover:bg-yellow-200"
            >
              <h3 className="text-lg font-bold">Reading Texts</h3>
              <p className="mt-2 text-sm opacity-80">
                Manage reading materials by level.
              </p>
            </Link>

            <Link
              href="/teacher/leaderboard"
              className="block rounded-2xl border border-black bg-yellow-50 p-5 transition hover:-translate-y-0.5 hover:bg-yellow-200"
            >
              <h3 className="text-lg font-bold">Leaderboard</h3>
              <p className="mt-2 text-sm opacity-80">
                Review rankings and classroom performance.
              </p>
            </Link>

            <Link
              href="/teacher/quiz-insights"
              className="block rounded-2xl border border-black bg-yellow-50 p-5 transition hover:-translate-y-0.5 hover:bg-yellow-200"
            >
              <h3 className="text-lg font-bold">Quiz Insights</h3>
              <p className="mt-2 text-sm opacity-80">
                See wrong-answer trends and student mistakes.
              </p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}