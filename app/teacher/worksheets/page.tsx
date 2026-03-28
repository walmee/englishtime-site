"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type ClassRow = {
  id: number;
  class_name: string;
  level: string;
};

type WorksheetRow = {
  id: number;
  title: string;
  description: string | null;
  file_url: string | null;
  class_id: number | null;
  due_date: string | null;
  created_at: string;
};

type NoticeTone = "error" | "success" | "info" | "warning";

export default function TeacherWorksheetsPage() {
  const router = useRouter();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [worksheets, setWorksheets] = useState<WorksheetRow[]>([]);
  const [classMap, setClassMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<NoticeTone>("info");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [classId, setClassId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFileUrl, setEditFileUrl] = useState("");
  const [editClassId, setEditClassId] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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

  const loadData = async () => {
    setLoading(true);
    setNotice("");
    setNoticeTone("info");

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

    if (currentRole !== "teacher") {
      router.replace("/dashboard");
      return;
    }

    const { data: teacherClassData, error: teacherClassError } = await supabase
      .from("teacher_classes")
      .select("class_id")
      .eq("teacher_id", userId);

    if (teacherClassError) {
      setNotice(teacherClassError.message);
      setNoticeTone("error");
      setClasses([]);
      setWorksheets([]);
      setLoading(false);
      return;
    }

    const allowedClassIds = Array.isArray(teacherClassData)
      ? teacherClassData
          .map((row: any) => Number(row.class_id))
          .filter((id) => Number.isFinite(id))
      : [];

    if (allowedClassIds.length === 0) {
      setClasses([]);
      setWorksheets([]);
      setClassMap({});
      setLoading(false);
      return;
    }

    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, class_name, level")
      .in("id", allowedClassIds)
      .eq("is_active", true)
      .order("class_name", { ascending: true });

    if (classError) {
      setNotice(classError.message);
      setNoticeTone("error");
      setClasses([]);
      setWorksheets([]);
      setLoading(false);
      return;
    }

    const classRows = (classData || []) as ClassRow[];
    const map: Record<number, string> = {};
    classRows.forEach((cls) => {
      map[cls.id] = `${cls.class_name} • ${cls.level}`;
    });

    const { data: worksheetData, error: worksheetError } = await supabase
      .from("worksheets")
      .select("id, title, description, file_url, class_id, due_date, created_at")
      .in("class_id", allowedClassIds)
      .order("created_at", { ascending: false });

    if (worksheetError) {
      setNotice(worksheetError.message);
      setNoticeTone("error");
      setWorksheets([]);
      setClasses(classRows);
      setClassMap(map);
      setLoading(false);
      return;
    }

    setClasses(classRows);
    setClassMap(map);
    setWorksheets((worksheetData || []) as WorksheetRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createWorksheet = async () => {
    setNotice("");

    const safeTitle = title.trim();
    if (!safeTitle) {
      setNotice("Worksheet title is required.");
      setNoticeTone("warning");
      return;
    }

    if (!classId) {
      setNotice("Please select a class.");
      setNoticeTone("warning");
      return;
    }

    const selectedClassId = Number(classId);
    const isAllowed = classes.some((cls) => cls.id === selectedClassId);

    if (!isAllowed) {
      setNotice("You can only create worksheets for your assigned classes.");
      setNoticeTone("warning");
      return;
    }

    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("worksheets").insert({
      title: safeTitle,
      description: description.trim() || null,
      file_url: fileUrl.trim() || null,
      class_id: selectedClassId,
      created_by: user?.id || null,
      due_date: dueDate || null,
    });

    if (error) {
      setNotice(error.message);
      setNoticeTone("error");
      setCreating(false);
      return;
    }

    setNotice("Worksheet created.");
    setNoticeTone("success");
    setTitle("");
    setDescription("");
    setFileUrl("");
    setClassId("");
    setDueDate("");
    setCreating(false);
    loadData();
  };

  const startEdit = (worksheet: WorksheetRow) => {
    const isAllowed = worksheet.class_id
      ? classes.some((cls) => cls.id === worksheet.class_id)
      : false;

    if (!isAllowed) {
      setNotice("You can only edit worksheets from your assigned classes.");
      setNoticeTone("warning");
      return;
    }

    setEditingId(worksheet.id);
    setEditTitle(worksheet.title || "");
    setEditDescription(worksheet.description || "");
    setEditFileUrl(worksheet.file_url || "");
    setEditClassId(worksheet.class_id ? String(worksheet.class_id) : "");
    setEditDueDate(worksheet.due_date || "");
    setNotice("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditFileUrl("");
    setEditClassId("");
    setEditDueDate("");
  };

  const saveEdit = async (worksheetId: number) => {
    setNotice("");

    const safeTitle = editTitle.trim();
    if (!safeTitle) {
      setNotice("Worksheet title is required.");
      setNoticeTone("warning");
      return;
    }

    if (!editClassId) {
      setNotice("Please select a class.");
      setNoticeTone("warning");
      return;
    }

    const selectedClassId = Number(editClassId);
    const isAllowed = classes.some((cls) => cls.id === selectedClassId);

    if (!isAllowed) {
      setNotice("You can only move worksheets inside your assigned classes.");
      setNoticeTone("warning");
      return;
    }

    setSavingEdit(true);

    const { error } = await supabase
      .from("worksheets")
      .update({
        title: safeTitle,
        description: editDescription.trim() || null,
        file_url: editFileUrl.trim() || null,
        class_id: selectedClassId,
        due_date: editDueDate || null,
      })
      .eq("id", worksheetId);

    if (error) {
      setNotice(error.message);
      setNoticeTone("error");
      setSavingEdit(false);
      return;
    }

    setNotice("Worksheet updated.");
    setNoticeTone("success");
    setSavingEdit(false);
    cancelEdit();
    loadData();
  };

  const deleteWorksheet = async (worksheetId: number, worksheetTitle: string) => {
    const ok = window.confirm(`Delete "${worksheetTitle}" worksheet?`);
    if (!ok) return;

    setNotice("");

    const worksheet = worksheets.find((w) => w.id === worksheetId);
    const isAllowed = worksheet?.class_id
      ? classes.some((cls) => cls.id === worksheet.class_id)
      : false;

    if (!isAllowed) {
      setNotice("You can only delete worksheets from your assigned classes.");
      setNoticeTone("warning");
      return;
    }

    const { error } = await supabase
      .from("worksheets")
      .delete()
      .eq("id", worksheetId);

    if (error) {
      setNotice(error.message);
      setNoticeTone("error");
      return;
    }

    setNotice("Worksheet deleted.");
    setNoticeTone("success");
    loadData();
  };

  const noticeStyles = getNoticeStyles(noticeTone);

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: "#f5f5f5", color: "#111111" }}>
      <main className="max-w-6xl mx-auto px-3 py-6 space-y-6">
        <div className="bg-white border rounded-3xl p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">My Worksheets</h1>
            <p className="text-sm mt-1 opacity-80">
              Upload and manage worksheets only for your assigned classes.
            </p>
          </div>

          <div className="bg-neutral-50 border rounded-2xl p-5 mb-6">
            <h2 className="text-xl font-bold mb-4">Create New Worksheet</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border bg-white"
                  placeholder="Example: Unit 5 Grammar Worksheet"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Class</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full p-3 rounded-xl border bg-white"
                >
                  <option value="">Select class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name} • {cls.level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">File Link</label>
                <input
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full p-3 rounded-xl border bg-white"
                  placeholder="PDF or Drive link"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-3 rounded-xl border bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border bg-white min-h-[120px]"
                  placeholder="Short description about the worksheet"
                />
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={createWorksheet}
                disabled={creating}
                className="px-4 py-3 rounded-xl border font-bold transition disabled:opacity-60"
                style={{ backgroundColor: "#facc15", color: "#111111", borderColor: "#111111" }}
              >
                {creating ? "Creating..." : "Create Worksheet"}
              </button>
            </div>
          </div>

          {notice ? (
            <div className={`mb-4 border rounded-2xl p-4 ${noticeStyles.wrapper}`}>
              <p className="font-bold">{noticeStyles.title}</p>
              <p className="text-sm break-words">{notice}</p>
            </div>
          ) : null}

          {loading ? (
            <div className="border border-dashed rounded-2xl p-8 text-center">
              Loading worksheets...
            </div>
          ) : worksheets.length === 0 ? (
            <div className="border border-dashed rounded-2xl p-8 text-center">
              No worksheets yet.
            </div>
          ) : (
            <div className="space-y-4">
              {worksheets.map((worksheet) => (
                <div key={worksheet.id} className="bg-neutral-50 border rounded-2xl p-5">
                  {editingId === worksheet.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-1">Title</label>
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full p-3 rounded-xl border bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-1">Class</label>
                        <select
                          value={editClassId}
                          onChange={(e) => setEditClassId(e.target.value)}
                          className="w-full p-3 rounded-xl border bg-white"
                        >
                          <option value="">Select class</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.class_name} • {cls.level}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-1">File Link</label>
                        <input
                          value={editFileUrl}
                          onChange={(e) => setEditFileUrl(e.target.value)}
                          className="w-full p-3 rounded-xl border bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-1">Due Date</label>
                        <input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="w-full p-3 rounded-xl border bg-white"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold mb-1">Description</label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full p-3 rounded-xl border bg-white min-h-[120px]"
                        />
                      </div>

                      <div className="md:col-span-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => saveEdit(worksheet.id)}
                          disabled={savingEdit}
                          className="px-4 py-3 rounded-xl border font-bold transition disabled:opacity-60"
                          style={{ backgroundColor: "#facc15", color: "#111111", borderColor: "#111111" }}
                        >
                          {savingEdit ? "Saving..." : "Save"}
                        </button>

                        <button
                          onClick={cancelEdit}
                          className="px-4 py-3 rounded-xl border font-bold bg-white hover:bg-neutral-100 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        <div className="md:col-span-2">
                          <div className="text-xs opacity-60">Title</div>
                          <div className="font-bold text-lg break-words">{worksheet.title}</div>
                          {worksheet.description ? (
                            <div className="text-sm mt-1 opacity-80 break-words">
                              {worksheet.description}
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <div className="text-xs opacity-60">Class</div>
                          <div className="font-bold">
                            {worksheet.class_id ? classMap[worksheet.class_id] || "-" : "-"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs opacity-60">Due Date</div>
                          <div className="font-bold">{worksheet.due_date || "-"}</div>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                          {worksheet.file_url ? (
                            <a
                              href={worksheet.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 rounded-xl border font-bold hover:bg-yellow-300 transition"
                              style={{ backgroundColor: "#facc15", color: "#111111", borderColor: "#111111" }}
                            >
                              Open
                            </a>
                          ) : null}

                          <button
                            onClick={() => startEdit(worksheet)}
                            className="px-3 py-2 rounded-xl border font-bold bg-white hover:bg-neutral-100 transition"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteWorksheet(worksheet.id, worksheet.title)}
                            className="px-3 py-2 rounded-xl border font-bold bg-red-500 text-white hover:bg-red-600 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 text-xs opacity-60">
                        Created: {new Date(worksheet.created_at).toLocaleString("tr-TR")}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}