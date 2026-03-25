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
};

export default function WritingPage() {
  const router = useRouter();

  const [studentId, setStudentId] = useState("");
  const [classId, setClassId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingTopicId, setSavingTopicId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

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

  const loadAll = async (sid: string, currentClassId: number) => {
    setLoading(true);
    setMessage("");

    const { data: topicData, error: topicError } = await supabase
      .from("writing_topics")
      .select("id, title, prompt, class_id, created_at")
      .eq("class_id", currentClassId)
      .order("id", { ascending: false });

    if (topicError) {
      setMessage(topicError.message);
      setTopics([]);
      setSubmissions([]);
      setLoading(false);
      return;
    }

    const topicRows = Array.isArray(topicData) ? (topicData as WritingTopicRow[]) : [];
    setTopics(topicRows);

    if (topicRows.length === 0) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    const topicIds = topicRows.map((t) => t.id);

    const { data: submissionData, error: submissionError } = await supabase
      .from("writing_submissions")
      .select("id, topic_id, submission_text, created_at")
      .eq("student_id", sid)
      .in("topic_id", topicIds);

    if (submissionError) {
      setMessage(submissionError.message);
      setSubmissions([]);
      setLoading(false);
      return;
    }

    setSubmissions(Array.isArray(submissionData) ? (submissionData as SubmissionRow[]) : []);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;
      if (!userId) {
        router.replace("/login");
        return;
      }

      setStudentId(userId);

      const { data: classStudent } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", userId)
        .maybeSingle();

      if (!classStudent?.class_id) {
        setMessage("No class assigned to this student.");
        setLoading(false);
        return;
      }

      setClassId(classStudent.class_id);
      await loadAll(userId, classStudent.class_id);
    };

    init();
  }, [router]);

  const submitWriting = async (topicId: number) => {
    setMessage("");

    if (!studentId) {
      setMessage("Student not found.");
      return;
    }

    const text = (drafts[topicId] || "").trim();
    if (!text) {
      setMessage("Please write your paragraph before submitting.");
      return;
    }

    setSavingTopicId(topicId);

    const { error } = await supabase.from("writing_submissions").insert({
      topic_id: topicId,
      student_id: studentId,
      submission_text: text,
    });

    if (error) {
      setMessage(error.message);
      setSavingTopicId(null);
      return;
    }

    if (classId) {
      await loadAll(studentId, classId);
    }

    setSavingTopicId(null);
    setMessage("Your writing has been submitted.");
  };

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <section className="bg-yellow-100 border border-black rounded-2xl p-6">
          <h1 className="text-3xl font-bold mb-2">Writing</h1>
          <p className="text-sm opacity-80">
            Complete the writing tasks assigned to your class. Each task can be submitted only once.
          </p>

          {message ? (
            <div className="mt-4 bg-yellow-50 border border-black rounded-xl p-4">
              {message}
            </div>
          ) : null}
        </section>

        {loading ? (
          <div className="bg-yellow-100 border border-black rounded-2xl p-8 text-center font-bold">
            Loading writing tasks...
          </div>
        ) : topics.length === 0 ? (
          <div className="bg-yellow-100 border border-black rounded-2xl p-8 text-center">
            No writing tasks assigned yet.
          </div>
        ) : (
          <div className="space-y-4">
            {topics.map((topic) => {
              const submission = submissionMap[topic.id];
              const isSubmitted = !!submission;

              return (
                <div
                  key={topic.id}
                  className="bg-yellow-100 border border-black rounded-2xl p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">{topic.title}</h2>
                      <p className="text-xs opacity-70 mt-1">
                        Published: {new Date(topic.created_at).toLocaleString("tr-TR")}
                      </p>
                    </div>

                    <span
                      className="px-3 py-1 rounded-md border border-black bg-yellow-50 text-sm font-bold"
                    >
                      {isSubmitted ? "Submitted" : "Not Submitted"}
                    </span>
                  </div>

                  <div className="mt-4 whitespace-pre-wrap bg-yellow-50 border border-black rounded-xl p-4 text-sm">
                    {topic.prompt}
                  </div>

                  {isSubmitted ? (
                    <div className="mt-4">
                      <div className="text-sm font-bold mb-2">Your submitted writing</div>
                      <div className="whitespace-pre-wrap bg-white border border-black rounded-xl p-4 text-sm">
                        {submission.submission_text}
                      </div>
                      <div className="text-xs opacity-70 mt-2">
                        Submitted: {new Date(submission.created_at).toLocaleString("tr-TR")}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <label className="block text-sm font-bold mb-2">Write your answer</label>
                      <textarea
                        value={drafts[topic.id] || ""}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [topic.id]: e.target.value }))
                        }
                        className="w-full min-h-[180px] p-4 rounded-xl border border-black bg-white"
                        placeholder="Write your paragraph here..."
                      />

                      <button
                        onClick={() => submitWriting(topic.id)}
                        disabled={savingTopicId === topic.id}
                        className="mt-4 px-5 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 transition disabled:opacity-60"
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