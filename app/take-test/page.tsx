"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type QuizRow = {
  id: number;
  title: string;
  unit: string | null;
};

type ResultRow = {
  quiz_id: number;
};

type GroupedQuizMap = Record<string, Record<string, QuizRow[]>>;

export default function TakeTestPage() {
  const router = useRouter();

  const [msg, setMsg] = useState("");
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  const [studentId, setStudentId] = useState("");
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [completedQuizIds, setCompletedQuizIds] = useState<number[]>([]);
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({});
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        router.replace("/login");
        return;
      }

      setStudentId(session.user.id);
    };

    loadUser();
  }, [router]);

  const getTopicAndTest = (quiz: QuizRow) => {
    const parts = quiz.title.split(" - ");
    const topic = parts[1] || "General";
    const testName = parts[2] || quiz.title;
    return { topic, testName };
  };

  const groupedQuizzes = useMemo<GroupedQuizMap>(() => {
    const grouped: GroupedQuizMap = {};

    quizzes.forEach((q) => {
      const unitKey = q.unit || "No Unit";
      const { topic } = getTopicAndTest(q);

      if (!grouped[unitKey]) grouped[unitKey] = {};
      if (!grouped[unitKey][topic]) grouped[unitKey][topic] = [];

      grouped[unitKey][topic].push(q);
    });

    return grouped;
  }, [quizzes]);

  const loadCompletedQuizzes = async (sid: string) => {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("quiz_id")
      .eq("student_id", sid);

    if (error) {
      setCompletedQuizIds([]);
      return;
    }

    const ids = Array.isArray(data)
      ? (data as ResultRow[]).map((row) => Number(row.quiz_id)).filter(Boolean)
      : [];

    setCompletedQuizIds(ids);
  };

  const loadQuizzes = async () => {
    setMsg("");
    setLoadingQuizzes(true);

    if (!studentId) {
      setLoadingQuizzes(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("level, class_name")
      .eq("id", studentId)
      .single();

    if (profileError || !profile) {
      setMsg("Profile information could not be loaded.");
      setQuizzes([]);
      setLoadingQuizzes(false);
      return;
    }

    const level = profile.level ? String(profile.level).trim() : "all";
    let className = profile.class_name ? String(profile.class_name).trim() : "all";

    const { data: classStudent } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", studentId)
      .maybeSingle();

    if (classStudent?.class_id) {
      const { data: classRow } = await supabase
        .from("classes")
        .select("class_name")
        .eq("id", classStudent.class_id)
        .maybeSingle();

      if (classRow?.class_name) {
        className = String(classRow.class_name).trim();
      }
    }

    const { data, error } = await supabase
      .from("quizzes")
      .select("id, title, unit")
      .or(
        `and(level.eq."${level}",class_name.eq."${className}"),and(level.eq."${level}",class_name.eq."all"),and(level.eq."all",class_name.eq."all")`
      )
      .order("id", { ascending: false });

    if (error) {
      setMsg(error.message);
      setQuizzes([]);
      setLoadingQuizzes(false);
      return;
    }

    const list = Array.isArray(data) ? (data as QuizRow[]) : [];
    setQuizzes(list);

    const initialOpenUnits: Record<string, boolean> = {};
    const initialOpenTopics: Record<string, boolean> = {};

    list.forEach((q, index) => {
      const unitKey = q.unit || "No Unit";
      const { topic } = getTopicAndTest(q);
      const topicKey = `${unitKey}__${topic}`;

      if (index === 0) {
        initialOpenUnits[unitKey] = true;
        initialOpenTopics[topicKey] = true;
      } else {
        if (initialOpenUnits[unitKey] === undefined) initialOpenUnits[unitKey] = false;
        if (initialOpenTopics[topicKey] === undefined) initialOpenTopics[topicKey] = false;
      }
    });

    setOpenUnits(initialOpenUnits);
    setOpenTopics(initialOpenTopics);

    await loadCompletedQuizzes(studentId);
    setLoadingQuizzes(false);
  };

  useEffect(() => {
    if (studentId) {
      loadQuizzes();
    }
  }, [studentId]);

  const toggleUnit = (unitKey: string) => {
    setOpenUnits((prev) => ({ ...prev, [unitKey]: !prev[unitKey] }));
  };

  const toggleTopic = (topicKey: string) => {
    setOpenTopics((prev) => ({ ...prev, [topicKey]: !prev[topicKey] }));
  };

  const totalQuizCount = quizzes.length;

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ backgroundColor: "#f5f5f5", color: "#111111" }}
    >
      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto overflow-x-hidden space-y-6">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold mb-2">Take a Test</h2>
          <p className="text-sm opacity-80">
            Choose your unit, topic, and test. Each test opens on its own page.
          </p>

          {msg ? (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="font-bold">Notice</p>
              <p className="text-sm break-words">{msg}</p>
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-4 items-start">
            <div>
              <label className="block text-sm font-bold mb-3">Available tests</label>

              {loadingQuizzes ? (
                <div className="w-full p-4 rounded-2xl border bg-neutral-50">
                  Loading quizzes...
                </div>
              ) : quizzes.length === 0 ? (
                <div className="w-full p-4 rounded-2xl border bg-neutral-50">
                  No quizzes available
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedQuizzes).map(([unitKey, topics]) => {
                    const isUnitOpen = !!openUnits[unitKey];
                    const unitTestCount = Object.values(topics).reduce(
                      (sum, arr) => sum + arr.length,
                      0
                    );

                    return (
                      <div
                        key={unitKey}
                        className="border rounded-3xl overflow-hidden bg-neutral-50 shadow-sm"
                      >
                        <button
                          onClick={() => toggleUnit(unitKey)}
                          className="w-full flex items-center justify-between px-4 py-4 text-left font-extrabold border-b bg-white"
                        >
                          <span>
                            {unitKey}{" "}
                            <span className="text-xs opacity-60">
                              ({unitTestCount} test{unitTestCount > 1 ? "s" : ""})
                            </span>
                          </span>
                          <span>{isUnitOpen ? "−" : "+"}</span>
                        </button>

                        {isUnitOpen ? (
                          <div className="p-4 space-y-3">
                            {Object.entries(topics).map(([topicKeyRaw, tests]) => {
                              const topicKey = `${unitKey}__${topicKeyRaw}`;
                              const isTopicOpen = !!openTopics[topicKey];

                              return (
                                <div
                                  key={topicKey}
                                  className="border rounded-2xl overflow-hidden bg-white"
                                >
                                  <button
                                    onClick={() => toggleTopic(topicKey)}
                                    className="w-full flex items-center justify-between px-4 py-3 text-left font-bold border-b bg-neutral-50"
                                  >
                                    <span>
                                      {topicKeyRaw}{" "}
                                      <span className="text-xs opacity-60">
                                        ({tests.length} test{tests.length > 1 ? "s" : ""})
                                      </span>
                                    </span>
                                    <span>{isTopicOpen ? "−" : "+"}</span>
                                  </button>

                                  {isTopicOpen ? (
                                    <div className="p-3 space-y-2">
                                      {tests.map((q) => {
                                        const { testName } = getTopicAndTest(q);
                                        const isCompleted = completedQuizIds.includes(q.id);

                                        return (
                                          <Link
                                            key={q.id}
                                            href={`/take-test/${q.id}`}
                                            className="block w-full text-left px-4 py-4 rounded-2xl border transition hover:bg-neutral-50"
                                            style={{
                                              backgroundColor: "#ffffff",
                                              color: "#111111",
                                            }}
                                          >
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                              <div className="min-w-0">
                                                <div className="font-semibold break-words">
                                                  {testName}
                                                </div>
                                                <div className="text-xs opacity-60 mt-1">
                                                  Open test page
                                                </div>
                                              </div>

                                              {isCompleted ? (
                                                <span className="text-xs px-2 py-1 rounded-lg border bg-neutral-50 shrink-0">
                                                  Completed
                                                </span>
                                              ) : (
                                                <span className="text-xs px-2 py-1 rounded-lg border bg-yellow-100 shrink-0">
                                                  Start
                                                </span>
                                              )}
                                            </div>
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="border rounded-3xl bg-white p-5 shadow-sm">
                <div className="text-xs opacity-60">Quiz browser</div>
                <div className="font-bold text-xl mt-1">{totalQuizCount} tests available</div>
                <div className="text-sm opacity-70 mt-3">
                  Completed tests stay marked. You can still open and practice them again.
                </div>
              </div>

              <div className="border rounded-3xl bg-white p-5 shadow-sm">
                <div className="text-xs opacity-60">How it works</div>
                <div className="text-sm mt-3 leading-6">
                  Choose a test from the list and open its own page.
                  <br />
                  Submit there to see your result and that test&apos;s mini leaderboard.
                </div>
              </div>

              <div className="border rounded-3xl bg-white p-5 shadow-sm">
                <div className="text-xs opacity-60">Tip</div>
                <div className="text-sm mt-3 leading-6">
                  Start with unfinished tests first, then return later to practice completed ones again.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}