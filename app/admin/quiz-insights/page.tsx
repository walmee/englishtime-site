"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type QuizRow = {
  id: number;
  title: string;
  unit: string | null;
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
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [quizId, setQuizId] = useState<number | null>(null);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [message, setMessage] = useState("");
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);

  const [insights, setInsights] = useState<QuizInsightsResponse | null>(null);

  const selectedQuizLabel = useMemo(() => {
    if (!insights?.quiz) return "";
    if (insights.quiz.unit && insights.quiz.title) {
      return `${insights.quiz.unit} • ${insights.quiz.title}`;
    }
    return insights.quiz.title || insights.quiz.unit || "Quiz";
  }, [insights]);

  useEffect(() => {
    const loadQuizzes = async () => {
      setLoadingQuizzes(true);
      setMessage("");

      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, unit")
        .order("id", { ascending: false });

      if (error) {
        setMessage(error.message);
        setQuizzes([]);
        setLoadingQuizzes(false);
        return;
      }

      const rows = Array.isArray(data) ? (data as QuizRow[]) : [];
      setQuizzes(rows);

      if (rows.length > 0) {
        setQuizId(rows[0].id);
      }

      setLoadingQuizzes(false);
    };

    loadQuizzes();
  }, []);

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

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          <h1 className="text-3xl font-bold mb-2">Quiz Insights</h1>
          <p className="text-sm opacity-80">
            Review the most missed questions and see which students got which questions wrong.
          </p>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">Select Quiz</label>
              <select
                value={quizId ?? ""}
                onChange={(e) => setQuizId(Number(e.target.value))}
                disabled={loadingQuizzes || quizzes.length === 0}
                className="w-full p-3 rounded-lg border border-black bg-white"
              >
                {loadingQuizzes ? (
                  <option>Loading quizzes...</option>
                ) : quizzes.length === 0 ? (
                  <option>No quizzes found</option>
                ) : (
                  quizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.unit && quiz.title
                        ? `${quiz.unit} • ${quiz.title}`
                        : quiz.title || quiz.unit || `Quiz ${quiz.id}`}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="border border-black rounded-xl p-4 bg-yellow-50">
              <div className="text-xs opacity-70">Selected Quiz</div>
              <div className="font-bold break-words">
                {selectedQuizLabel || "No quiz selected"}
              </div>
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
                          <p className="font-bold">
                            #{index + 1} Most Missed
                          </p>
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
                              Score: <b>{student.score}%</b> • Wrong Answers: <b>{student.wrong_count}</b>
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