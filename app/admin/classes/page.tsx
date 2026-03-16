"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type ClassRow = {
  id: number;
  class_name: string;
  level: string;
  teacher_id: string | null;
  started_at: string | null;
  is_active: boolean;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
};

type ClassStudentRow = {
  class_id: number;
  student_id: string;
};

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<ProfileRow[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [className, setClassName] = useState("");
  const [level, setLevel] = useState("A1");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editLevel, setEditLevel] = useState("A1");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setMessage("");

    const { data: classesData, error: classesError } = await supabase
      .from("classes")
      .select("*")
      .order("id", { ascending: true });

    if (classesError) {
      setMessage(classesError.message);
      setClasses([]);
      setLoading(false);
      return;
    }

    const { data: teacherData } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("role", "admin");

    const { data: studentData } = await supabase
      .from("class_students")
      .select("class_id, student_id");

    const counts: Record<number, number> = {};
    (studentData || []).forEach((row: ClassStudentRow) => {
      counts[row.class_id] = (counts[row.class_id] || 0) + 1;
    });

    setClasses((classesData || []) as ClassRow[]);
    setTeachers((teacherData || []) as ProfileRow[]);
    setStudentCounts(counts);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createClass = async () => {
    setMessage("");

    const safeName = className.trim();
    if (!safeName) {
      setMessage("Sınıf adı boş olamaz.");
      return;
    }

    setCreating(true);

    const { error } = await supabase.from("classes").insert({
      class_name: safeName,
      level,
      is_active: true,
    });

    if (error) {
      setMessage(error.message);
      setCreating(false);
      return;
    }

    setMessage("Yeni sınıf oluşturuldu.");
    setClassName("");
    setLevel("A1");
    setCreating(false);
    loadData();
  };

  const updateTeacher = async (classId: number, teacherId: string) => {
    setMessage("");

    const { error } = await supabase
      .from("classes")
      .update({
        teacher_id: teacherId || null,
        started_at: teacherId ? new Date().toISOString() : null,
      })
      .eq("id", classId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Öğretmen ataması güncellendi.");
    loadData();
  };

  const startEdit = (cls: ClassRow) => {
    setEditingId(cls.id);
    setEditClassName(cls.class_name);
    setEditLevel(cls.level);
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditClassName("");
    setEditLevel("A1");
  };

  const saveEdit = async (classId: number) => {
    setMessage("");

    const safeName = editClassName.trim();
    if (!safeName) {
      setMessage("Sınıf adı boş olamaz.");
      return;
    }

    setSavingEdit(true);

    const { error } = await supabase
      .from("classes")
      .update({
        class_name: safeName,
        level: editLevel,
      })
      .eq("id", classId);

    if (error) {
      setMessage(error.message);
      setSavingEdit(false);
      return;
    }

    setMessage("Sınıf bilgileri güncellendi.");
    setSavingEdit(false);
    cancelEdit();
    loadData();
  };

  const toggleStatus = async (cls: ClassRow) => {
    setMessage("");

    const { error } = await supabase
      .from("classes")
      .update({
        is_active: !cls.is_active,
      })
      .eq("id", cls.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      cls.is_active ? "Sınıf pasif hale getirildi." : "Sınıf aktif hale getirildi."
    );
    loadData();
  };

  const deleteClass = async (cls: ClassRow) => {
    const ok = window.confirm(
      `"${cls.class_name}" sınıfı silinsin mi? Bu işlem geri alınamaz.`
    );

    if (!ok) return;

    setMessage("");

    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", cls.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Sınıf silindi.");
    loadData();
  };

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Classes</h1>
            <p className="text-sm mt-1">
              Sınıfları, seviyeleri ve öğretmen atamalarını yönet.
            </p>
          </div>

          <div className="bg-yellow-50 border border-black rounded-xl p-4 mb-6">
            <h2 className="text-xl font-bold mb-4">Yeni Sınıf Oluştur</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-bold mb-1">Sınıf Adı</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Örn: California"
                  className="w-full p-3 rounded-lg border border-black bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Seviye</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full p-3 rounded-lg border border-black bg-white"
                >
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                </select>
              </div>

              <div>
                <button
                  onClick={createClass}
                  disabled={creating}
                  className="w-full px-4 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 transition disabled:opacity-60"
                >
                  {creating ? "Oluşturuluyor..." : "Sınıf Oluştur"}
                </button>
              </div>
            </div>
          </div>

          {message ? (
            <div className="mb-4 bg-yellow-50 border border-black rounded-xl p-4">
              {message}
            </div>
          ) : null}

          {loading ? (
            <div className="border border-dashed border-black rounded-lg p-8 text-center">
              Loading classes...
            </div>
          ) : classes.length === 0 ? (
            <div className="border border-dashed border-black rounded-lg p-8 text-center">
              No classes found.
            </div>
          ) : (
            <div className="space-y-4">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-yellow-50 border border-black rounded-xl p-4"
                >
                  {editingId === cls.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div>
                        <label className="block text-sm font-bold mb-1">Sınıf Adı</label>
                        <input
                          type="text"
                          value={editClassName}
                          onChange={(e) => setEditClassName(e.target.value)}
                          className="w-full p-3 rounded-lg border border-black bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-1">Seviye</label>
                        <select
                          value={editLevel}
                          onChange={(e) => setEditLevel(e.target.value)}
                          className="w-full p-3 rounded-lg border border-black bg-white"
                        >
                          <option value="A1">A1</option>
                        <option value="A2">A2</option>
                        <option value="B1">B1</option>
                        <option value="B2">B2</option>
                        <option value="C1">C1</option>
                        <option value="C2">C2</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(cls.id)}
                          disabled={savingEdit}
                          className="px-4 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 transition disabled:opacity-60"
                        >
                          {savingEdit ? "Kaydediliyor..." : "Kaydet"}
                        </button>

                        <button
                          onClick={cancelEdit}
                          className="px-4 py-3 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition font-bold"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        <div>
                          <div className="text-xs opacity-70">Class</div>
                          <div className="font-bold text-lg">{cls.class_name}</div>
                        </div>

                        <div>
                          <div className="text-xs opacity-70">Level</div>
                          <div className="font-bold">{cls.level}</div>
                        </div>

                        <div>
                          <div className="text-xs opacity-70">Students</div>
                          <div className="font-bold">{studentCounts[cls.id] || 0}</div>
                        </div>

                        <div>
                          <div className="text-xs opacity-70 mb-1">Teacher</div>
                          <select
                            value={cls.teacher_id || ""}
                            onChange={(e) => updateTeacher(cls.id, e.target.value)}
                            className="w-full p-2 rounded-lg border border-black bg-white"
                          >
                            <option value="">No teacher</option>
                            {teachers.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.username || teacher.id}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex md:justify-end">
                          <Link
                            href={`/admin/classes/${cls.id}`}
                            className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition font-bold"
                          >
                            View Class
                          </Link>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => startEdit(cls)}
                          className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition font-bold"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => toggleStatus(cls)}
                          className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition font-bold"
                        >
                          {cls.is_active ? "Make Inactive" : "Make Active"}
                        </button>

                        <button
                          onClick={() => deleteClass(cls)}
                          className="px-4 py-2 rounded-lg border border-black bg-red-500 text-white hover:bg-red-600 transition font-bold"
                        >
                          Delete Class
                        </button>
                      </div>

                      <div className="mt-3 text-xs opacity-70">
                        Status: {cls.is_active ? "Active" : "Inactive"}{" "}
                        {cls.started_at
                          ? `• Teacher assigned: ${new Date(cls.started_at).toLocaleDateString("tr-TR")}`
                          : ""}
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