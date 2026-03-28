"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type WritingTopicRow = {
  id: number;
  title: string;
  prompt: string;
  class_id: number;
  created_at: string;
};

type SubmissionRow = {
  id: number;
  topic_id: number;
  submission_text: string;
  created_at: string;
  score: number | null;
  feedback: string | null;
  reviewed_at: string | null;
};

type NoticeTone = "error" | "success" | "info" | "warning";

export default function WritingPage() {
  const router = useRouter();

  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingTopicId, setSavingTopicId] = useState<number | null>(null);

  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<NoticeTone>("info");

  const [topics, setTopics] = useState<WritingTopicRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const submissionMap = useMemo(() => {
    const map: Record<number, SubmissionRow> = {};
    submissions.forEach((s) => {
      map[s.topic_id] = s;
    });
    return map;
  }, [submissions]);

  const reviewedCount = useMemo(() => {
    return submissions.filter((s) => s.reviewed_at).length;
  }, [submissions]);

  const averageScore = useMemo(() => {
    const scored = submissions.filter((s) => typeof s.score === "number");
    if (!scored.length) return null;
    const total = scored.reduce((sum, s) => sum + Number(s.score || 0), 0);
    return Math.round(total / scored.length);
  }, [submissions]);

  const getNoticeStyles = (tone: NoticeTone) => {
    switch (tone) {
      case "error":
        return {
          wrapper: "bg-red-50 border-red-200 text-red-900",
          title: "Issue",
        };
      case "success":
        return {
          wrapper: "bg-emerald-50 border-emerald-200 text-emerald-900",
          title: "Success",
        };
      case "warning":
        return {
          wrapper: "bg-amber-50 border-amber-200 text-amber-900",
          title: "Notice",
        };
      default:
        return {
          wrapper: "bg-sky-50 border-sky-200 text-sky-900",
          title: "Info",
        };
    }
  };

  const getSubmissionBadge = (submission?: SubmissionRow) => {
    if (!submission) {
      return {
        label: "Not Submitted",
        className: "bg-neutral-100 text-neutral-800 border-neutral-200",
      };
    }

    if (submission.reviewed_at) {
      return {
        label: "Reviewed",
        className: "bg-emerald-100 text-emerald-900 border-emerald-200",
      };
    }

    return {
      label: "Submitted",
      className: "bg-amber-100 text-amber-900 border-amber-200",
    };
  };

  const getScoreBoxStyle = (score: number | null) => {
    if (score === null) {
      return "bg-neutral-50 border-neutral-200 text-neutral-900";
    }
    if (score >= 90) {
      return "bg-emerald-50 border-emerald-200 text-emerald-900";
    }
    if (score >= 75) {
      return "bg-amber-50 border-amber-200 text-amber-900";
    }
    return "bg-red-50 border-red-200 text-red-900";
  };

  const loadAll = async () => {
    setLoading(true);
    setNotice("");
    setNoticeTone("info");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;
    const accessToken = session?.access_token;

    if (!userId || !accessToken) {
      router.replace("/login");
      return;
    }

    setStudentId(userId);

    try {
      const res = await fetch("/api/student/writing", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setNotice(json?.error || "Writing tasks could not be loaded.");
        setNoticeTone("error");
        setTopics([]);
        setSubmissions([]);
        setLoading(false);
        return;
      }

      setClassId(typeof json?.classId === "number" ? json.classId : null);
      setTopics(Array.isArray(json?.topics) ? (json.topics as WritingTopicRow[]) : []);
      setSubmissions(
        Array.isArray(json?.submissions) ? (json.submissions as SubmissionRow[]) : []
      );
      setLoading(false);
    } catch (e: any) {
      setNotice(e?.message || "Writing tasks could not be loaded.");
      setNoticeTone("error");
      setTopics([]);
      setSubmissions([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [router]);

  const submitWriting = async (topicId: number) => {
    setNotice("");

    if (!studentId) {
      setNotice("Student not found.");
      setNoticeTone("error");
      return;
    }

    const text = (drafts[topicId] || "").trim();
    if (!text) {
      setNotice("Please write your paragraph before submitting.");
      setNoticeTone("warning");
      return;
    }

    setSavingTopicId(topicId);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/student/writing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          topic_id: topicId,
          submission_text: text,
        }),
      });

      const textRes = await res.text();
      const json = textRes ? JSON.parse(textRes) : {};

      if (!res.ok) {
        setNotice(json?.error || "Submission failed.");
        setNoticeTone("error");
        setSavingTopicId(null);
        return;
      }

      await loadAll();
      setSavingTopicId(null);
      setNotice(json?.message || "Your writing has been submitted successfully.");
      setNoticeTone("success");
    } catch (e: any) {
      setNotice(e?.message || "Submission failed.");
      setNoticeTone("error");
      setSavingTopicId(null);
    }
  };

  const noticeStyles = getNoticeStyles(noticeTone);

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ backgroundColor: "#f5f5f5", color: "#111111" }}
    >
      <main className="max-w-6xl mx-auto px-3 py-6 space-y-6">
        <section className="bg-white border rounded-3xl p-6 shadow-sm">
          <h1 className="text-3xl font-bold mb-2">Writing</h1>
          <p className="text-sm opacity-80">
            Complete the writing tasks assigned to your class. Each task can be submitted once,
            and your teacher&apos;s score and feedback will appear here after review.
          </p>

          {notice ? (
            <div className={`mt-4 border rounded-2xl p-4 ${noticeStyles.wrapper}`}>
              <p className="font-bold">{noticeStyles.title}</p>
              <p className="text-sm break-words">{notice}</p>
            </div>
          ) : null}

          {!loading ? (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-xs opacity-60">Total tasks</div>
                <div className="text-2xl font-bold mt-1">{topics.length}</div>
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-xs opacity-60">Reviewed submissions</div>
                <div className="text-2xl font-bold mt-1">{reviewedCount}</div>
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-xs opacity-60">Average score</div>
                <div className="text-2xl font-bold mt-1">
                  {averageScore !== null ? averageScore : "-"}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {loading ? (
          <div className="bg-white border rounded-3xl p-8 text-center shadow-sm font-bold">
            Loading writing tasks...
          </div>
        ) : topics.length === 0 ? (
          <div className="bg-white border rounded-3xl p-8 text-center shadow-sm">
            No writing tasks assigned yet.
          </div>
        ) : (
          <div className="space-y-5">
            {topics.map((topic, index) => {
              const submission = submissionMap[topic.id];
              const isSubmitted = !!submission;
              const badge = getSubmissionBadge(submission);

              return (
                <div
                  key={topic.id}
                  className="bg-white border rounded-3xl p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs opacity-60 mb-2">
                        Writing Task {index + 1}
                      </div>
                      <h2 className="text-2xl font-bold break-words">{topic.title}</h2>
                      <p className="text-xs opacity-60 mt-2">
                        Published: {new Date(topic.created_at).toLocaleString("tr-TR")}
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-xl border text-sm font-bold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border bg-neutral-50 p-4">
                    <div className="text-sm font-bold mb-2">Task Prompt</div>
                    <div className="whitespace-pre-wrap text-sm break-words">
                      {topic.prompt}
                    </div>
                  </div>

                  {isSubmitted ? (
                    <div className="mt-5 space-y-5">
                      <div className="rounded-2xl border bg-white p-4">
                        <div className="text-sm font-bold mb-2">Your Submitted Writing</div>
                        <div className="whitespace-pre-wrap text-sm break-words leading-6">
                          {submission.submission_text}
                        </div>
                        <div className="text-xs opacity-60 mt-3">
                          Submitted: {new Date(submission.created_at).toLocaleString("tr-TR")}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
                        <div
                          className={`rounded-2xl border p-5 ${getScoreBoxStyle(
                            submission.score
                          )}`}
                        >
                          <div className="text-xs opacity-70">Teacher Score</div>
                          <div className="text-3xl font-extrabold mt-2">
                            {submission.score ?? "-"}
                          </div>
                          <div className="text-xs opacity-70 mt-3">
                            {submission.reviewed_at ? "Reviewed" : "Waiting for review"}
                          </div>
                        </div>

                        <div className="rounded-2xl border bg-neutral-50 p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <div className="text-sm font-bold">Teacher Feedback</div>
                            <div className="text-xs opacity-60">
                              {submission.reviewed_at
                                ? `Reviewed: ${new Date(submission.reviewed_at).toLocaleString(
                                    "tr-TR"
                                  )}`
                                : "Not reviewed yet"}
                            </div>
                          </div>

                          <div className="rounded-2xl border bg-white p-4 min-h-[120px]">
                            <div className="whitespace-pre-wrap text-sm break-words leading-6">
                              {submission.feedback || "No feedback yet."}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5">
                      <label className="block text-sm font-bold mb-2">Write your answer</label>
                      <textarea
                        value={drafts[topic.id] || ""}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [topic.id]: e.target.value }))
                        }
                        className="w-full min-h-[220px] p-4 rounded-2xl border bg-white"
                        placeholder="Write your paragraph here..."
                      />

                      <div className="mt-3 text-xs opacity-60">
                        Once submitted, this writing will be saved for teacher review.
                      </div>

                      <button
                        onClick={() => submitWriting(topic.id)}
                        disabled={savingTopicId === topic.id}
                        className="mt-4 px-5 py-3 rounded-xl border font-bold transition disabled:opacity-60"
                        style={{
                          backgroundColor: "#facc15",
                          color: "#111111",
                          borderColor: "#111111",
                        }}
                      >
                        {savingTopicId === topic.id ? "Submitting..." : "Submit Writing"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}