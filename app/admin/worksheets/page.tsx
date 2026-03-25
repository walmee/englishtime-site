"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Role = "admin" | "teacher";

type ClassRow = {
  id: number;
  class_name: string;
  level: string | null;
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

type TeacherClassJoinRow = {
  class_id: number;
  classes: {
    id: number;
    class_name: string;
    level: string | null;
  } | null;
};

export default function AdminWorksheetsPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [worksheets, setWorksheets] = useState<WorksheetRow[]>([]);
  const [classMap, setClassMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [classId, setClassId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);

  const pageTitle = useMemo(() => {
    return role === "teacher" ? "My Worksheets" : "Worksheets";
  }, [role]);

  const pageDescription = useMemo(() => {
    return role === "teacher"
      ? "Upload and manage worksheets only for your assigned classes."
      : "Send worksheets and assignments to classes.";
  }, [role]);

  const loadData = async () => {
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

    if (currentRole === "teacher") {
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
        setClasses([]);
        setWorksheets([]);
        setLoading(false);
        return;
      }

      const teacherClasses = ((teacherClassData || []) as TeacherClassJoinRow[])
        .map((row) => row.classes)
        .filter(Boolean)
        .map((cls) => ({
          id: cls!.id,
          class_name: cls!.class_name,
          level: cls!.level,
        }));

      const map: Record<number, string> = {};
      teacherClasses.forEach((cls) => {
        map[cls.id] = `${cls.class_name}${cls.level ? ` • ${cls.level}` : ""}`;
      });

      setClasses(teacherClasses);
      setClassMap(map);

      const classIds = teacherClasses.map((cls) => cls.id);

      if (classIds.length === 0) {
        setWorksheets([]);
        setLoading(false);
        return;
      }

      const { data: worksheetData, error: worksheetError } = await supabase
        .from("worksheets")
        .select("id, title, description, file_url, class_id, due_date, created_at")
        .in("class_id", classIds)
        .order("created_at", { ascending: false });

      if (worksheetError) {
        setMessage(worksheetError.message);
        setWorksheets([]);
        setLoading(false);
        return;
      }

      setWorksheets((worksheetData || []) as WorksheetRow[]);
      setLoading(false);
      return;
    }

    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, class_name, level")
      .eq("is_active", true)
      .order("class_name", { ascending: true });

    if (classError) {
      setMessage(classError.message);
      setClasses([]);
      setWorksheets([]);
      setLoading(false);
      return;
    }

    const classRows = (classData || []) as ClassRow[];
    const map: Record<number, string> = {};
    classRows.forEach((cls) => {
      map[cls.id] = `${cls.class_name}${cls.level ? ` • ${cls.level}` : ""}`;
    });

    const { data: worksheetData, error: worksheetError } = await supabase
      .from("worksheets")
      .select("id, title, description, file_url, class_id, due_date, created_at")
      .order("created_at", { ascending: false });

    if (worksheetError) {
      setMessage(worksheetError.message);
      setClasses(classRows);
      setClassMap(map);
      setWorksheets([]);
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
    setMessage("");

    const safeTitle = title.trim();
    if (!safeTitle) {
      setMessage("Worksheet title is required.");
      return;
    }

    if (!classId) {
      setMessage("Please select a class.");
      return;
    }

    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const selectedClassId = Number(classId);

    if (role === "teacher") {
      const isAllowed = classes.some((c) => c.id === selectedClassId);
      if (!isAllowed) {
        setMessage("You can only upload worksheets for your assigned classes.");
        setCreating(false);
        return;
      }
    }

    const { error } = await supabase.from("worksheets").insert({
      title: safeTitle,
      description: description.trim() || null,
      file_url: fileUrl.trim() || null,
      class_id: selectedClassId,
      created_by: user?.id || null,
      due_date: dueDate || null,
    });

    if (error) {
      setMessage(error.message);
      setCreating(false);
      return;
    }

    setMessage("Worksheet created.");
    setTitle("");
    setDescription("");
    setFileUrl("");
    setClassId("");
    setDueDate("");
    setCreating(false);
    loadData();
  };

  const deleteWorksheet = async (worksheetId: number, worksheetTitle: string) => {
    const ok = window.confirm(`Delete "${worksheetTitle}" worksheet?`);
    if (!ok) return;

    setMessage("");

    if (role === "teacher") {
      const target = worksheets.find((w) => w.id === worksheetId);
      const isAllowed = target?.class_id ? classes.some((c) => c.id === target.class_id) : false;

      if (!isAllowed) {
        setMessage("You can only delete worksheets from your assigned classes.");
        return;
      }
    }

    const { error } = await supabase.from("worksheets").delete().eq("id", worksheetId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Worksheet deleted.");
    loadData();
  };

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">{pageTitle}</h1>
            <p className="text-sm mt-1">{pageDescription}</p>
          </div>

          <div className="bg-yellow-50 border border-black rounded-xl p-4 mb-6">
            <h2 className="text-xl font-bold mb-4">Create Worksheet</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 rounded-lg border border-black bg-white"
                  placeholder="Example: Unit 5 Grammar Worksheet"
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
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name} {cls.level ? `• ${cls.level}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">File URL</label>
                <input
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full p-3 rounded-lg border border-black bg-white"
                  placeholder="PDF or Drive link"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-3 rounded-lg border border-black bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-lg border border-black bg-white min-h-[120px]"
                  placeholder="Short worksheet description"
                />
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={createWorksheet}
                disabled={creating}
                className="px-4 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 transition disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create Worksheet"}
              </button>
            </div>
          </div>

          {message ? (
            <div className="mb-4 bg-yellow-50 border border-black rounded-xl p-4">
              {message}
            </div>
          ) : null}

          {loading ? (
            <div className="border border-dashed border-black rounded-lg p-8 text-center">
              Loading worksheets...
            </div>
          ) : worksheets.length === 0 ? (
            <div className="border border-dashed border-black rounded-lg p-8 text-center">
              No worksheets yet.
            </div>
          ) : (
            <div className="space-y-3">
              {worksheets.map((worksheet) => (
                <div
                  key={worksheet.id}
                  className="bg-yellow-50 border border-black rounded-xl p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div className="md:col-span-2">
                      <div className="text-xs opacity-70">Title</div>
                      <div className="font-bold text-lg">{worksheet.title}</div>
                      {worksheet.description ? (
                        <div className="text-sm mt-1 opacity-80">{worksheet.description}</div>
                      ) : null}
                    </div>

                    <div>
                      <div className="text-xs opacity-70">Class</div>
                      <div className="font-bold">
                        {worksheet.class_id ? classMap[worksheet.class_id] || "-" : "-"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs opacity-70">Due Date</div>
                      <div className="font-bold">{worksheet.due_date || "-"}</div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                      {worksheet.file_url ? (
                        <a
                          href={worksheet.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition font-bold"
                        >
                          Open
                        </a>
                      ) : null}

                      <button
                        onClick={() => deleteWorksheet(worksheet.id, worksheet.title)}
                        className="px-3 py-2 rounded-lg border border-black bg-red-500 text-white hover:bg-red-600 transition font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 text-xs opacity-70">
                    Created: {new Date(worksheet.created_at).toLocaleString("tr-TR")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}