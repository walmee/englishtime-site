"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type QuestionRow = {
  id: number;
  quiz_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  points: number;
};

type RankingRow = {
  student_id: string;
  username: string;
  score: number;
};

type ReviewAnswerRow = {
  question_id: number;
  selected_option: "A" | "B" | "C" | "D" | null;
  correct_option: "A" | "B" | "C" | "D";
  is_correct: boolean;
};

type AnswerMap = Record<number, "A" | "B" | "C" | "D">;

export default function QuizSolvePage() {
  const params = useParams();
  const quizId = Number(params.id);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(false);

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [reviewAnswers, setReviewAnswers] = useState<Record<number, ReviewAnswerRow>>({});

  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [quizRanking, setQuizRanking] = useState<RankingRow[]>([]);
  const [serverScore, setServerScore] = useState<number | null>(null);

  // USER
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        setStudentId(user.id);
      }
    };

    loadUser();
  }, []);

  // QUESTIONS
  const loadQuestions = async () => {
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`/api/quiz/${quizId}`);
      const json = await res.json();

      if (!res.ok) {
        setMsg(json?.error || "Failed to load questions.");
        return;
      }

      setQuestions(json.questions || []);
    } catch (e: any) {
      setMsg(e?.message || "Error loading questions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (quizId) loadQuestions();
  }, [quizId]);

  // RANKING
  const loadRanking = async () => {
    setLoadingRanking(true);

    try {
      const res = await fetch(`/api/quiz-ranking?quiz_id=${quizId}`);
      const json = await res.json();

      if (res.ok) {
        setQuizRanking(json.ranking || []);
      }
    } finally {
      setLoadingRanking(false);
    }
  };

  // ANSWER
  const pick = (qid: number, opt: "A" | "B" | "C" | "D") => {
    if (finished) return;
    setAnswers((prev) => ({ ...prev, [qid]: opt }));
  };

  // SUBMIT
  const submitTest = async () => {
    setMsg("");
    setSubmitting(true);

    try {
      setFinished(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      const submittedAnswers = questions.map((q) => ({
        question_id: q.id,
        selected_option: answers[q.id] ?? null,
      }));

      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quiz_id: quizId,
          answers: submittedAnswers,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMsg(json?.error || "Submit failed.");
        setFinished(false);
        return;
      }

      const reviewMap: Record<number, ReviewAnswerRow> = {};
      (json.answers || []).forEach((a: ReviewAnswerRow) => {
        reviewMap[a.question_id] = a;
      });

      setReviewAnswers(reviewMap);
      setServerScore(json.score || 0);

      await loadRanking();
    } catch (e: any) {
      setMsg(e?.message || "Error");
      setFinished(false);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setFinished(false);
    setAnswers({});
    setReviewAnswers({});
    setServerScore(null);
    setMsg("");
  };

  const totalPoints = useMemo(() => {
    return questions.reduce((sum, q) => sum + (q.points || 0), 0);
  }, [questions]);

  const userRank = useMemo(() => {
    const index = quizRanking.findIndex((r) => r.student_id === studentId);
    return index >= 0 ? index + 1 : null;
  }, [quizRanking, studentId]);

  return (
    <div className="min-h-screen p-4 space-y-6">
      <Link href="/take-test" className="underline">
        ← Back to tests
      </Link>

      <h1 className="text-2xl font-bold">Quiz #{quizId}</h1>

      {msg && <div className="text-red-500">{msg}</div>}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* QUESTIONS */}
          <div className="space-y-4">
            {questions.map((q, i) => {
              const review = reviewAnswers[q.id];

              return (
                <div key={q.id} className="border p-4 rounded">
                  <div className="font-bold">
                    Q{i + 1} ({q.points} pts)
                  </div>
                  <div>{q.question_text}</div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {(["A", "B", "C", "D"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => pick(q.id, opt)}
                        className="border p-2"
                        disabled={finished}
                      >
                        {opt}) {(q as any)[`option_${opt.toLowerCase()}`]}
                      </button>
                    ))}
                  </div>

                  {finished && (
                    <div className="mt-2 text-sm">
                      Your: {review?.selected_option ?? "-"} | Correct:{" "}
                      {review?.correct_option ?? "-"} |{" "}
                      {review?.is_correct ? "✅" : "❌"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* BUTTON */}
          <div className="text-center mt-6">
            {!finished ? (
              <button onClick={submitTest} disabled={submitting}>
                Submit
              </button>
            ) : (
              <button onClick={reset}>Try Again</button>
            )}
          </div>

          {/* RESULT */}
          {finished && (
            <div className="border p-4 mt-6 rounded">
              <h2 className="font-bold text-xl">Result</h2>
              <p>
                Score: {serverScore} / {totalPoints}
              </p>

              {userRank && <p>Your Rank: #{userRank}</p>}

              {/* RANKING */}
              {loadingRanking ? (
                <p>Loading ranking...</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {quizRanking.map((r, i) => (
                    <div key={i}>
                      #{i + 1} {r.username} — {r.score}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}