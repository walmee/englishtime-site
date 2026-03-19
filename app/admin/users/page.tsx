"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type StudentRow = {
  id: string;
  username: string | null;
  role: string | null;
  level: string | null;
  is_active: boolean | null;
};

type ClassRow = {
  id: number;
  class_name: string;
};

type ClassStudentRow = {
  class_id: number;
  student_id: string;
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classMap, setClassMap] = useState<Record<string, string>>({});
  const [classIdMap, setClassIdMap] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState("A1");
  const [classId, setClassId] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editLevel, setEditLevel] = useState("A1");
  const [editClassId, setEditClassId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setMessage("");

    const { data: studentsData, error: studentsError } = await supabase
      .from("profiles")
      .select("id, username, role, level, is_active")
      .eq("role", "student")
      .order("username", { ascending: true });

    if (studentsError) {
      setMessage(studentsError.message);
      setStudents([]);
      setLoading(false);
      return;
    }

    const { data: classesData, error: classesError } = await supabase
      .from("classes")
      .select("id, class_name")
      .order("class_name", { ascending: true });

    if (classesError) {
      setMessage(classesError.message);
      setStudents([]);
      setLoading(false);
      return;
    }

    const { data: classStudentsData, error: classStudentsError } = await supabase
      .from("class_students")
      .select("class_id, student_id");

    if (classStudentsError) {
      setMessage(classStudentsError.message);
      setStudents([]);
      setLoading(false);
      return;
    }

    const classNameById: Record<number, string> = {};
    (classesData || []).forEach((c: ClassRow) => {
      classNameById[c.id] = c.class_name;
    });

    const studentClassMap: Record<string, string> = {};
    const studentClassIdMap: Record<string, number | null> = {};

    (classStudentsData || []).forEach((row: ClassStudentRow) => {
      studentClassMap[row.student_id] = classNameById[row.class_id] || "-";
      studentClassIdMap[row.student_id] = row.class_id;
    });

    setStudents((studentsData || []) as StudentRow[]);
    setClasses((classesData || []) as ClassRow[]);
    setClassMap(studentClassMap);
    setClassIdMap(studentClassIdMap);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const createStudent = async () => {
    setMessage("");

    const safeUsername = username.trim();
    const safeEmail = email.trim().toLowerCase();
    const safePassword = password.trim();

    if (!safeUsername || !safeEmail || !safePassword) {
      setMessage("Username, email, and password are required.");
      return;
    }

    if (!level.trim()) {
      setMessage("Level is required.");
      return;
    }

    if (!classId) {
      setMessage("Class is required.");
      return;
    }

    setCreating(true);

    try {
      const res = await fetch("/api/admin/students/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: safeUsername,
          email: safeEmail,
          password: safePassword,
          level,
          class_id: Number(classId),
        }),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setMessage(json?.error || "Student could not be created.");
        setCreating(false);
        return;
      }

      setMessage("New student created successfully.");
      setUsername("");
      setEmail("");
      setPassword("");
      setLevel("A1");
      setClassId("");
      setCreating(false);
      loadData();
    } catch (e: any) {
      setMessage(e?.message || "Unexpected error occurred.");
      setCreating(false);
    }
  };

  const startEdit = (student: StudentRow) => {
    setEditingId(student.id);
    setEditUsername(student.username || "");
    setEditLevel(student.level || "A1");
    setEditClassId(classIdMap[student.id] ? String(classIdMap[student.id]) : "");
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditUsername("");
    setEditLevel("A1");
    setEditClassId("");
  };

  const saveEdit = async (studentId: string) => {
    setMessage("");

    const safeUsername = editUsername.trim();
    if (!safeUsername) {
      setMessage("Username cannot be empty.");
      return;
    }

    if (!editLevel.trim()) {
      setMessage("Level is required.");
      return;
    }

    if (!editClassId) {
      setMessage("Class is required.");
      return;
    }

    setSavingEdit(true);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        username: safeUsername,
        level: editLevel,
      })
      .eq("id", studentId);

    if (profileError) {
      setMessage(profileError.message);
      setSavingEdit(false);
      return;
    }

    const numericClassId = Number(editClassId);

    const { data: existingClassRow, error: existingClassError } = await supabase
      .from("class_students")
      .select("student_id, class_id")
      .eq("student_id", studentId)
      .maybeSingle();

    if (existingClassError) {
      setMessage(existingClassError.message);
      setSavingEdit(false);
      return;
    }

    if (existingClassRow) {
      const { error: updateClassError } = await supabase
        .from("class_students")
        .update({
          class_id: numericClassId,
        })
        .eq("student_id", studentId);

      if (updateClassError) {
        setMessage(updateClassError.message);
        setSavingEdit(false);
        return;
      }
    } else {
      const { error: insertClassError } = await supabase
        .from("class_students")
        .insert({
          student_id: studentId,
          class_id: numericClassId,
        });

      if (insertClassError) {
        setMessage(insertClassError.message);
        setSavingEdit(false);
        return;
      }
    }

    setMessage("Student information updated successfully.");
    setSavingEdit(false);
    cancelEdit();
    loadData();
  };

  const toggleActive = async (student: StudentRow) => {
    setMessage("");

    try {
      const res = await fetch("/api/admin/students/toggle-active", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: student.id,
          isActive: !student.is_active,
        }),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setMessage(json?.error || "Status could not be updated.");
        return;
      }

      setMessage(json?.message || "Status updated.");
      loadData();
    } catch (e: any) {
      setMessage(e?.message || "Unexpected error occurred.");
    }
  };

  const deleteStudent = async (student: StudentRow) => {
    const ok = window.confirm(
      `${student.username || "This student"} will be deleted. This action cannot be undone.`
    );
    if (!ok) return;

    setMessage("");

    try {
      const res = await fetch("/api/admin/students/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: student.id,
        }),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setMessage(json?.error || "Student could not be deleted.");
        return;
      }

      setMessage(json?.message || "Student deleted.");
      loadData();
    } catch (e: any) {
      setMessage(e?.message || "Unexpected error occurred.");
    }
  };

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Students</h1>
            <p className="text-sm mt-1">
              View students, create a new student, edit details, deactivate, or delete.
            </p>
          </div>

          <div className="bg-yellow-50 border border-black rounded-xl p-4 mb-6">
            <h2 className="text-xl font-bold mb-4">Create New Student</h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 rounded-lg border border-black bg-white"
                  placeholder="Example: sila"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-lg border border-black bg-white"
                  placeholder="Example: sila@mail.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 rounded-lg border border-black bg-white"
                  placeholder="Password"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Level</label>
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
                <label className="block text-sm font-bold mb-1">Class</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full p-3 rounded-lg border border-black bg-white"
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.class_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={createStudent}
                disabled={creating}
                className="px-4 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 transition disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create Student"}
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
              Loading students...
            </div>
          ) : students.length === 0 ? (
            <div className="border border-dashed border-black rounded-lg p-8 text-center">
              No students found.
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="bg-yellow-50 border border-black rounded-xl p-4"
                >
                  {editingId === student.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                      <div>
                        <label className="block text-sm font-bold mb-1">Username</label>
                        <input
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="w-full p-3 rounded-lg border border-black bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-1">Class</label>
                        <select
                          value={editClassId}
                          onChange={(e) => setEditClassId(e.target.value)}
                          className="w-full p-3 rounded-lg border border-black bg-white"
                        >
                          <option value="">Select class</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.class_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-1">Level</label>
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

                      <div>
                        <label className="block text-sm font-bold mb-1">Status</label>
                        <div className="w-full p-3 rounded-lg border border-black bg-gray-100 font-bold">
                          {student.is_active ? "Active" : "Inactive"}
                        </div>
                      </div>

                      <div className="flex gap-2 md:col-span-2">
                        <button
                          onClick={() => saveEdit(student.id)}
                          disabled={savingEdit}
                          className="px-4 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 transition disabled:opacity-60"
                        >
                          {savingEdit ? "Saving..." : "Save"}
                        </button>

                        <button
                          onClick={cancelEdit}
                          className="px-4 py-3 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      <div>
                        <div className="text-xs opacity-70">Username</div>
                        <div className="font-bold text-lg">
                          {student.username || "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs opacity-70">Current Class</div>
                        <div className="font-bold">{classMap[student.id] || "-"}</div>
                      </div>

                      <div>
                        <div className="text-xs opacity-70">Level</div>
                        <div className="font-bold">{student.level || "-"}</div>
                      </div>

                      <div>
                        <div className="text-xs opacity-70">Role</div>
                        <div className="font-bold">{student.role || "-"}</div>
                      </div>

                      <div>
                        <div className="text-xs opacity-70">Status</div>
                        <div className="font-bold">
                          {student.is_active ? "Active" : "Inactive"}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                        <button
                          onClick={() => startEdit(student)}
                          className="px-3 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition font-bold"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => toggleActive(student)}
                          className="px-3 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition font-bold"
                        >
                          {student.is_active ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          onClick={() => deleteStudent(student)}
                          className="px-3 py-2 rounded-lg border border-black bg-red-500 text-white hover:bg-red-600 transition font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
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