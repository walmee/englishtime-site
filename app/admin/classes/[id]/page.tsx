"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

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
  role: string | null;
  level: string | null;
};

type ClassStudentRow = {
  id: number;
  class_id: number;
  student_id: string;
  joined_at: string;
};

type StudentWithProfile = {
  relationId: number;
  student_id: string;
  username: string;
  level: string;
  joined_at: string;
};

export default function AdminClassDetailPage() {
  const params = useParams();
  const classId = Number(params.id);

  const [classData, setClassData] = useState<ClassRow | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [students, setStudents] = useState<StudentWithProfile[]>([]);
  const [allStudents, setAllStudents] = useState<ProfileRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");

  const availableStudents = useMemo(() => {
    const currentIds = new Set(students.map((s) => s.student_id));

    return allStudents.filter((s) => {
      const notAlreadyInClass = !currentIds.has(s.id);
      const levelMatches = classData ? s.level === classData.level : true;
      return notAlreadyInClass && levelMatches;
    });
  }, [allStudents, students, classData]);

  const loadData = async () => {
    if (!classId) return;

    setLoading(true);
    setMessage("");

    const { data: classResult, error: classError } = await supabase
      .from("classes")
      .select("*")
      .eq("id", classId)
      .single();

    if (classError) {
      setMessage(classError.message);
      setClassData(null);
      setLoading(false);
      return;
    }

    const cls = classResult as ClassRow;
    setClassData(cls);

    if (cls.teacher_id) {
      const { data: teacherProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", cls.teacher_id)
        .single();

      setTeacherName(teacherProfile?.username || "");
    } else {
      setTeacherName("");
    }

    const { data: relationRows, error: relationError } = await supabase
      .from("class_students")
      .select("*")
      .eq("class_id", classId)
      .order("joined_at", { ascending: true });

    if (relationError) {
      setMessage(relationError.message);
      setStudents([]);
      setLoading(false);
      return;
    }

    const relations = (relationRows || []) as ClassStudentRow[];

    if (relations.length === 0) {
      setStudents([]);
    } else {
      const studentIds = relations.map((r) => r.student_id);

      const { data: studentProfiles, error: studentProfilesError } = await supabase
        .from("profiles")
        .select("id, username, role, level")
        .in("id", studentIds);

      if (studentProfilesError) {
        setMessage(studentProfilesError.message);
        setStudents([]);
        setLoading(false);
        return;
      }

      const profileMap = new Map<string, ProfileRow>();
      ((studentProfiles || []) as ProfileRow[]).forEach((p) => {
        profileMap.set(p.id, p);
      });

      const merged: StudentWithProfile[] = relations.map((rel) => {
        const profile = profileMap.get(rel.student_id);
        return {
          relationId: rel.id,
          student_id: rel.student_id,
          username: profile?.username || "Unknown Student",
          level: profile?.level || "-",
          joined_at: rel.joined_at,
        };
      });

      setStudents(merged);
    }

    const { data: allStudentProfiles, error: allStudentsError } = await supabase
      .from("profiles")
      .select("id, username, role, level")
      .eq("role", "student")
      .order("username", { ascending: true });

    if (allStudentsError) {
      setMessage(allStudentsError.message);
      setAllStudents([]);
      setLoading(false);
      return;
    }

    setAllStudents((allStudentProfiles || []) as ProfileRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [classId]);

  const addStudentToClass = async () => {
    if (!selectedStudentId) {
      setMessage("Lütfen bir öğrenci seç.");
      return;
    }

    if (!classData) {
      setMessage("Sınıf bilgisi bulunamadı.");
      return;
    }

    const selectedStudent = allStudents.find((s) => s.id === selectedStudentId);

    if (!selectedStudent) {
      setMessage("Seçilen öğrenci bulunamadı.");
      return;
    }

    if (selectedStudent.level !== classData.level) {
      setMessage(
        `Bu öğrenci eklenemez. Öğrenci seviyesi ${selectedStudent.level}, sınıf seviyesi ${classData.level}.`
      );
      return;
    }

    setAdding(true);
    setMessage("");

    const { error } = await supabase.from("class_students").insert({
      class_id: classId,
      student_id: selectedStudentId,
    });

    if (error) {
      setMessage(error.message);
      setAdding(false);
      return;
    }

    setMessage("Öğrenci sınıfa eklendi.");
    setSelectedStudentId("");
    setAdding(false);
    loadData();
  };

  const removeStudentFromClass = async (relationId: number) => {
    const ok = window.confirm("Bu öğrenci sınıftan çıkarılsın mı?");
    if (!ok) return;

    setMessage("");

    const { error } = await supabase
      .from("class_students")
      .delete()
      .eq("id", relationId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Öğrenci sınıftan çıkarıldı.");
    loadData();
  };

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-4">
          <Link
            href="/admin/classes"
            className="inline-block px-4 py-2 rounded-lg border border-black bg-yellow-200 hover:bg-yellow-100 transition font-bold"
          >
            ← Classes sayfasına dön
          </Link>
        </div>

        {message ? (
          <div className="mb-4 bg-yellow-100 border border-black rounded-xl p-4">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="bg-yellow-100 border border-black rounded-2xl p-8 text-center">
            Loading class...
          </div>
        ) : !classData ? (
          <div className="bg-yellow-100 border border-black rounded-2xl p-8 text-center">
            Class not found.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-yellow-100 border border-black rounded-2xl p-6">
              <h1 className="text-3xl font-bold mb-2">{classData.class_name}</h1>
              <p className="text-sm">
                Level: <b>{classData.level}</b> • Status:{" "}
                <b>{classData.is_active ? "Active" : "Inactive"}</b>
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-yellow-50 border border-black rounded-xl p-4">
                  <div className="text-xs opacity-70">Teacher</div>
                  <div className="font-bold text-lg">
                    {teacherName || "No teacher assigned"}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-black rounded-xl p-4">
                  <div className="text-xs opacity-70">Students</div>
                  <div className="font-bold text-lg">{students.length}</div>
                </div>

                <div className="bg-yellow-50 border border-black rounded-xl p-4">
                  <div className="text-xs opacity-70">Started</div>
                  <div className="font-bold text-lg">
                    {classData.started_at
                      ? new Date(classData.started_at).toLocaleDateString("tr-TR")
                      : "-"}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-100 border border-black rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">Öğrenci Ekle</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-1">Öğrenci Seç</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full p-3 rounded-lg border border-black bg-white"
                  >
                    <option value="">Öğrenci seç</option>
                    {availableStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.username || student.id} {student.level ? `• ${student.level}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <button
                    onClick={addStudentToClass}
                    disabled={adding}
                    className="w-full px-4 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 transition disabled:opacity-60"
                  >
                    {adding ? "Ekleniyor..." : "Sınıfa Ekle"}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-yellow-100 border border-black rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">Sınıf Üyeleri</h2>

              {students.length === 0 ? (
                <div className="border border-dashed border-black rounded-lg p-8 text-center bg-yellow-50">
                  Bu sınıfta henüz öğrenci yok.
                </div>
              ) : (
                <div className="space-y-3">
                  {students.map((student) => (
                    <div
                      key={student.relationId}
                      className="bg-yellow-50 border border-black rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-lg">{student.username}</div>
                        <div className="text-sm opacity-80">
                          Level: {student.level} • Joined:{" "}
                          {new Date(student.joined_at).toLocaleDateString("tr-TR")}
                        </div>
                      </div>

                      <button
                        onClick={() => removeStudentFromClass(student.relationId)}
                        className="px-4 py-2 rounded-lg border border-black bg-red-500 text-white hover:bg-red-600 transition font-bold"
                      >
                        Sınıftan Çıkar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}