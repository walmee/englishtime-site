"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type ClassRow = {
  id: number;
  class_name: string;
  level: string | null;
};

type WritingTopicRow = {
  id: number;
  title: string;
  prompt: string;
  class_id: number;
  created_at: string;
};

type StudentSubmissionRow = {
  id: number;
  topic_id: number;
  student_id: string;
  submission_text: string;
  created_at: string;
};

type StudentProfileRow = {
  id: string;
  username: string | null;
};

export default function TeacherWritingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [teacherId, setTeacherId] = useState("");
  const [assignedClasses, setAssignedClasses] = useState<ClassRow[]>([]);
  const [topics, setTopics] = useState<WritingTopicRow[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmissionRow[]>([]);
  const [studentMap, setStudentMap] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [classId, setClassId] = useState("");

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  const filteredTopics = useMemo(() => {
    if (!selectedClassId) return topics;
    return topics.filter((t) => t.class_id === Number(selectedClassId));
  }, [topics, selectedClassId]);

  const filteredSubmissions = useMemo(() => {
    if (!selectedTopicId) return [];
    return submissions.filter((s) => s.topic_id === selectedTopicId);
  }, [submissions, selectedTopicId]);

  const classMap = useMemo(() => {
    const map: Record<number, string> = {};
    assignedClasses.forEach((c) => {
      map[c.id] = `${c.class_name}${c.level ? ` • ${c.level}` : ""}`;
    });
    return map;
  }, [assignedClasses]);

  const loadAll = async (currentTeacherId: string) => {
    setLoading(true);
    setMessage("");

    const { data: teacherClasses, error: teacherClassesError } = await supabase
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
      .eq("teacher_id", currentTeacherId);

    if (teacherClassesError) {
      setMessage(teacherClassesError.message);
      setAssignedClasses([]);
      setTopics([]);
      setSubmissions([]);
      setLoading(false);
      return;
    }

    const classRows: ClassRow[] = (teacherClasses || [])
      .map((row: any) => row.classes)
      .filter(Boolean)
      .map((cls: any) => ({
        id: cls.id,
        class_name: cls.class_name,
        level: cls.level,
      }));

    setAssignedClasses(classRows);

    const classIds = classRows.map((c) => c.id);

    if (classIds.length === 0) {
      setTopics([]);
      setSubmissions([]);
      setStudentMap({});
      setLoading(false);
      return;
    }

    const { data: topicData, error: topicError } = await supabase
      .from("writing_topics")
      .select("id, title, prompt, class_id, created_at")
      .in("class_id", classIds)
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

    const topicIds = topicRows.map((t) => t.id);

    if (topicIds.length === 0) {
      setSubmissions([]);
      setStudentMap({});
      setLoading(false);
      return;
    }

    const { data: submissionData, error: submissionError } = await supabase
      .from("writing_submissions")
      .select("id, topic_id, student_id, submission_text, created_at")
      .in("topic_id", topicIds)
      .order("created_at", { ascending: false });

    if (submissionError) {
      setMessage(submissionError.message);
      setSubmissions([]);
      setLoading(false);
      return;
    }

    const submissionRows = Array.isArray(submissionData)
      ? (submissionData as StudentSubmissionRow[])
      : [];
    setSubmissions(submissionRows);

    const studentIds = [...new Set(submissionRows.map((s) => s.student_id).filter(Boolean))];

    if (studentIds.length > 0) {
      const { data: studentProfiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", studentIds);

      const map: Record<string, string> = {};
      ((studentProfiles || []) as StudentProfileRow[]).forEach((s) => {
        map[s.id] = s.username || "Student";
      });
      setStudentMap(map);
    } else {
      setStudentMap({});
    }

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

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error || !profile) {
        router.replace("/login");
        return;
      }

      const role = String(profile.role || "").toLowerCase();
      if (role !== "teacher" && role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setTeacherId(userId);
      await loadAll(userId);
    };

    init();
  }, [router]);

  const createTopic = async () => {
    setMessage("");

    if (!teacherId) {
      setMessage("Teacher not found.");
      return;
    }

    if (!title.trim() || !prompt.trim() || !classId) {
      setMessage("Title, prompt and class are required.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("writing_topics").insert({
      title: title.trim(),
      prompt: prompt.trim(),
      class_id: Number(classId),
      created_by: teacherId,
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setTitle("");
    setPrompt("");
    setClassId("");
    setMessage("Writing topic created.");
    setSaving(false);
    await loadAll(teacherId);
  };

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <section className="bg-yellow-100 border border-black rounded-2xl p-6">
          <h1 className="text-3xl font-bold mb-2">Writing Panel</h1>
          <p className="text-sm opacity-80">
            Create a writing topic for a class and review student submissions.
          </p>

          {message ? (
            <div className="mt-4 bg-yellow-50 border border-black rounded-xl p-4">
              {message}
            </div>
          ) : null}
        </section>

        <section className="bg-yellow-100 border border-black rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">Create Writing Topic</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Topic / Tense Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 rounded-lg border border-black bg-white"
                placeholder="Example: Present Perfect Writing"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Class</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full p-3 rounded-lg border border-black bg-white"
              >
                <option value="">Select class</option>
                {assignedClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name} {cls.level ? `• ${cls.level}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">Writing Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-3 rounded-lg border border-black bg-white min-h-[140px]"
                placeholder="Write the instructions, topic, or tense task here..."
              />
            </div>
          </div>

          <button
            onClick={createTopic}
            disabled={saving}
            className="mt-4 px-5 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 transition disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create Writing Topic"}
          </button>
        </section>

        <section className="bg-yellow-100 border border-black rounded-2xl p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[240px]">
              <label className="block text-sm font-bold mb-1">Filter by Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedTopicId(null);
                }}
                className="w-full p-3 rounded-lg border border-black bg-white"
              >
                <option value="">All classes</option>
                {assignedClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name} {cls.level ? `• ${cls.level}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[280px]">
              <label className="block text-sm font-bold mb-1">Select Writing Topic</label>
              <select
                value={selectedTopicId ?? ""}
                onChange={(e) => setSelectedTopicId(Number(e.target.value))}
                className="w-full p-3 rounded-lg border border-black bg-white"
              >
                <option value="">Select topic</option>
                {filteredTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title} • {classMap[topic.class_id] || `Class #${topic.class_id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="bg-yellow-100 border border-black rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">Student Submissions</h2>

          {loading ? (
            <div className="border border-dashed border-black rounded-lg p-8 text-center bg-yellow-50">
              Loading submissions...
            </div>
          ) : !selectedTopicId ? (
            <div className="border border-dashed border-black rounded-lg p-8 text-center bg-yellow-50">
              Select a writing topic to view student submissions.
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="border border-dashed border-black rounded-lg p-8 text-center bg-yellow-50">
              No submissions yet for this topic.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-yellow-50 border border-black rounded-xl p-4"
                >
                  <div className="font-bold text-lg">
                    {studentMap[submission.student_id] || submission.student_id}
                  </div>
                  <div className="text-xs opacity-70 mt-1">
                    Submitted: {new Date(submission.created_at).toLocaleString("tr-TR")}
                  </div>

                  <div className="mt-4 whitespace-pre-wrap text-sm bg-white border border-black rounded-lg p-4">
                    {submission.submission_text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}