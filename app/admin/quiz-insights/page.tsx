"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type QuizRow = {
  id: number;
  title: string;
  unit: string | null;
  class_name: string | null;
  level: string | null;
};

type SummaryRow = {
  attempts_count: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
};

type MostMissedQuestionRow = {
  question_id: number;
  question_text: string;
  correct_option: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  total_answers: number;
  correct_count: number;
  wrong_count: number;
  wrong_rate: number;
};

type StudentWrongAnswerRow = {
  question_id: number;
  question_text: string;
  selected_option: string | null;
  correct_option: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
};

type StudentMistakeRow = {
  student_id: string;
  username: string;
  score: number;
  wrong_count: number;
  wrong_answers: StudentWrongAnswerRow[];
};

type QuizInsightsResponse = {
  ok: boolean;
  quiz: {
    id: number;
    title: string;
    unit: string | null;
  };
  summary: SummaryRow;
  most_missed_questions: MostMissedQuestionRow[];
  student_mistakes: StudentMistakeRow[];
};

type Role = "admin" | "teacher";

type GroupedQuizMap = Record<string, Record<string, QuizRow[]>>;

function getOptionText(
  row: {
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
  },
  option: string | null
) {
  if (!option) return "-";
  const normalized = String(option).toUpperCase();

  if (normalized === "A") return row.option_a || "A";
  if (normalized === "B") return row.option_b || "B";
  if (normalized === "C") return row.option_c || "C";
  if (normalized === "D") return row.option_d || "D";

  return option;
}

export default function AdminQuizInsightsPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [quizId, setQuizId] = useState<number | null>(null);

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [message, setMessage] = useState("");
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);

  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({});
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({});

  const [insights, setInsights] = useState<QuizInsightsResponse | null>(null);

  const selectedQuizLabel = useMemo(() => {
    if (!insights?.quiz) return "";
    if (insights.quiz.unit && insights.quiz.title) {
      return `${insights.quiz.unit} • ${insights.quiz.title}`;
    }
    return insights.quiz.title || insights.quiz.unit || "Quiz";
  }, [insights]);

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

  const selectedQuiz = useMemo(() => {
    return quizzes.find((q) => q.id === quizId) || null;
  }, [quizzes, quizId]);

  useEffect(() => {
    const loadQuizzes = async () => {
      setLoadingPage(true);
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
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        router.replace("/login");
        return;
      }

      const currentRole = String(profile.role || "").toLowerCase();

      if (currentRole !== "admin" && currentRole !== "teacher") {
        router.replace("/dashboard");
        return;
      }

      setRole(currentRole as Role);

      let rows: QuizRow[] = [];

      if (currentRole === "teacher") {
        const { data: teacherClasses, error: teacherClassError } = await supabase
          .from("teacher_classes")
          .select(
            `
            class_id,
            classes (
              class_name
            )
          `
          )
          .eq("teacher_id", userId);

        if (teacherClassError) {
          setMessage(teacherClassError.message);
          setQuizzes([]);
          setLoadingPage(false);
          return;
        }

        const classNames = (teacherClasses || [])
          .map((row: any) => row.classes?.class_name)
          .filter(Boolean);

        if (classNames.length === 0) {
          setQuizzes([]);
          setQuizId(null);
          setLoadingPage(false);
          return;
        }

        const { data, error } = await supabase
          .from("quizzes")
          .select("id, title, unit, class_name, level")
          .in("class_name", classNames)
          .order("id", { ascending: false });

        if (error) {
          setMessage(error.message);
          setQuizzes([]);
          setLoadingPage(false);
          return;
        }

        rows = Array.isArray(data) ? (data as QuizRow[]) : [];
      } else {
        const { data, error } = await supabase
          .from("quizzes")
          .select("id, title, unit, class_name, level")
          .order("id", { ascending: false });

        if (error) {
          setMessage(error.message);
          setQuizzes([]);
          setLoadingPage(false);
          return;
        }

        rows = Array.isArray(data) ? (data as QuizRow[]) : [];
      }

      setQuizzes(rows);

      if (rows.length > 0) {
        setQuizId(rows[0].id);
      } else {
        setQuizId(null);
      }

      const initialOpenUnits: Record<string, boolean> = {};
      const initialOpenTopics: Record<string, boolean> = {};

      rows.forEach((q, index) => {
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
      setLoadingPage(false);
    };

    loadQuizzes();
  }, [router]);

  useEffect(() => {
    const loadInsights = async () => {
      if (!quizId) return;

      setLoadingInsights(true);
      setMessage("");
      setOpenStudentId(null);

      try {
        const res = await fetch(`/api/admin/quiz-insights?quiz_id=${quizId}`);
        const text = await res.text();
        const json = text ? JSON.parse(text) : {};

        if (!res.ok) {
          setMessage(json?.error || "Failed to load quiz insights.");
          setInsights(null);
          setLoadingInsights(false);
          return;
        }

        setInsights(json as QuizInsightsResponse);
      } catch (e: any) {
        setMessage(e?.message || "Unexpected error occurred.");
        setInsights(null);
      } finally {
        setLoadingInsights(false);
      }
    };

    loadInsights();
  }, [quizId]);

  const toggleUnit = (unitKey: string) => {
    setOpenUnits((prev) => ({ ...prev, [unitKey]: !prev[unitKey] }));
  };

  const toggleTopic = (topicKey: string) => {
    setOpenTopics((prev) => ({ ...prev, [topicKey]: !prev[topicKey] }));
  };

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          <h1 className="text-3xl font-bold mb-2">
            {role === "teacher" ? "My Quiz Insights" : "Quiz Insights"}
          </h1>
          <p className="text-sm opacity-80">
            {role === "teacher"
              ? "Review insights for quizzes that belong to your assigned classes."
              : "Review the most missed questions and see which students got which questions wrong."}
          </p>

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-4 items-start">
            <div>
              <label className="block text-sm font-bold mb-3">Available quizzes</label>

              {loadingPage ? (
                <div className="border border-black rounded-xl p-4 bg-white">
                  Loading quizzes...
                </div>
              ) : quizzes.length === 0 ? (
                <div className="border border-black rounded-xl p-4 bg-white">
                  No quizzes found.
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
                        className="border border-black rounded-xl overflow-hidden bg-yellow-50"
                      >
                        <button
                          onClick={() => toggleUnit(unitKey)}
                          className="w-full flex items-center justify-between px-4 py-4 text-left font-extrabold border-b border-black bg-white"
                        >
                          <span>
                            {unitKey}{" "}
                            <span className="text-xs opacity-70">
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
                                  className="border border-black rounded-lg overflow-hidden bg-white"
                                >
                                  <button
                                    onClick={() => toggleTopic(topicKey)}
                                    className="w-full flex items-center justify-between px-4 py-3 text-left font-bold border-b border-black bg-yellow-50"
                                  >
                                    <span>
                                      {topicKeyRaw}{" "}
                                      <span className="text-xs opacity-70">
                                        ({tests.length} test{tests.length > 1 ? "s" : ""})
                                      </span>
                                    </span>
                                    <span>{isTopicOpen ? "−" : "+"}</span>
                                  </button>

                                  {isTopicOpen ? (
                                    <div className="p-3 space-y-2">
                                      {tests.map((quiz) => {
                                        const { testName } = getTopicAndTest(quiz);
                                        const isSelected = quizId === quiz.id;

                                        return (
                                          <button
                                            key={quiz.id}
                                            onClick={() => setQuizId(quiz.id)}
                                            className="block w-full text-left px-4 py-3 rounded-lg border border-black transition"
                                            style={{
                                              backgroundColor: isSelected ? "#facc15" : "white",
                                            }}
                                          >
                                            <div className="font-semibold">{testName}</div>
                                            <div className="text-xs opacity-70 mt-1">
                                              Class: <b>{quiz.class_name ?? "-"}</b> • Level:{" "}
                                              <b>{quiz.level ?? "-"}</b> • ID #{quiz.id}
                                            </div>
                                          </button>
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
              <div className="border border-black rounded-xl p-4 bg-yellow-50">
                <div className="text-xs opacity-70">Selected Quiz</div>
                <div className="font-bold break-words mt-1">
                  {selectedQuizLabel || "No quiz selected"}
                </div>
              </div>

              {selectedQuiz ? (
                <div className="border border-black rounded-xl p-4 bg-yellow-50">
                  <div className="text-xs opacity-70">Quiz Details</div>
                  <div className="text-sm mt-2">
                    Class: <b>{selectedQuiz.class_name ?? "-"}</b>
                  </div>
                  <div className="text-sm mt-1">
                    Level: <b>{selectedQuiz.level ?? "-"}</b>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {message ? (
          <div className="bg-red-100 border border-black rounded-xl p-4">
            <p className="font-bold">Notice</p>
            <p className="text-sm">{message}</p>
          </div>
        ) : null}

        {loadingInsights ? (
          <div className="bg-yellow-100 border border-black rounded-2xl p-8 text-center font-bold">
            Loading quiz insights...
          </div>
        ) : insights ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-yellow-100 border border-black rounded-xl p-5">
                <div className="text-xs opacity-70">Attempts</div>
                <div className="text-3xl font-extrabold">{insights.summary.attempts_count}</div>
              </div>

              <div className="bg-yellow-100 border border-black rounded-xl p-5">
                <div className="text-xs opacity-70">Average Score</div>
                <div className="text-3xl font-extrabold">{insights.summary.average_score}%</div>
              </div>

              <div className="bg-yellow-100 border border-black rounded-xl p-5">
                <div className="text-xs opacity-70">Highest Score</div>
                <div className="text-3xl font-extrabold">{insights.summary.highest_score}%</div>
              </div>

              <div className="bg-yellow-100 border border-black rounded-xl p-5">
                <div className="text-xs opacity-70">Lowest Score</div>
                <div className="text-3xl font-extrabold">{insights.summary.lowest_score}%</div>
              </div>
            </div>

            <div className="bg-yellow-100 border border-black rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-2">Most Missed Questions</h2>
              <p className="text-sm opacity-80 mb-5">
                Questions are sorted by highest wrong answer count.
              </p>

              {insights.most_missed_questions.length === 0 ? (
                <div className="border border-dashed border-black rounded-lg p-6 text-center bg-yellow-50">
                  No question analytics found for this quiz yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.most_missed_questions.map((q, index) => (
                    <div
                      key={q.question_id}
                      className="bg-yellow-50 border border-black rounded-xl p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="font-bold">#{index + 1} Most Missed</p>
                          <p className="mt-2 break-words">{q.question_text}</p>
                          <p className="mt-3 text-sm break-words">
                            <b>Correct Answer:</b> {getOptionText(q, q.correct_option)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 shrink-0">
                          <span className="px-3 py-1 rounded-md border border-black bg-red-100 text-sm font-bold">
                            Wrong: {q.wrong_count}
                          </span>
                          <span className="px-3 py-1 rounded-md border border-black bg-green-100 text-sm font-bold">
                            Correct: {q.correct_count}
                          </span>
                          <span className="px-3 py-1 rounded-md border border-black bg-yellow-200 text-sm font-bold">
                            Wrong Rate: {q.wrong_rate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-yellow-100 border border-black rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-2">Student Mistakes</h2>
              <p className="text-sm opacity-80 mb-5">
                Review which students missed which questions.
              </p>

              {insights.student_mistakes.length === 0 ? (
                <div className="border border-dashed border-black rounded-lg p-6 text-center bg-yellow-50">
                  No student data found for this quiz yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.student_mistakes.map((student) => {
                    const isOpen = openStudentId === student.student_id;

                    return (
                      <div
                        key={student.student_id}
                        className="bg-yellow-50 border border-black rounded-xl p-4"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <p className="font-bold text-lg break-words">{student.username}</p>
                            <p className="text-sm mt-1">
                              Score: <b>{student.score}%</b> • Wrong Answers:{" "}
                              <b>{student.wrong_count}</b>
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              setOpenStudentId(isOpen ? null : student.student_id)
                            }
                            className="px-4 py-2 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 transition"
                          >
                            {isOpen ? "Hide Mistakes" : "View Mistakes"}
                          </button>
                        </div>

                        {isOpen ? (
                          <div className="mt-4 border-t border-black pt-4 space-y-3">
                            {student.wrong_answers.length === 0 ? (
                              <div className="border border-dashed border-black rounded-lg p-4 text-sm">
                                This student has no saved wrong answers for this quiz.
                              </div>
                            ) : (
                              student.wrong_answers.map((wrong, idx) => (
                                <div
                                  key={`${student.student_id}-${wrong.question_id}`}
                                  className="border border-black rounded-lg p-4 bg-white"
                                >
                                  <p className="font-bold mb-2">Wrong Question {idx + 1}</p>
                                  <p className="text-sm break-words mb-3">
                                    {wrong.question_text}
                                  </p>
                                  <p className="text-sm break-words">
                                    <b>Student Answer:</b>{" "}
                                    {getOptionText(wrong, wrong.selected_option)}
                                  </p>
                                  <p className="text-sm break-words mt-1">
                                    <b>Correct Answer:</b>{" "}
                                    {getOptionText(wrong, wrong.correct_option)}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-yellow-100 border border-black rounded-2xl p-8 text-center">
            Select a quiz to see insights.
          </div>
        )}
      </main>
    </div>
  );
}