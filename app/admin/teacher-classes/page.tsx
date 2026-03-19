"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type TeacherRow = {
  id: string;
  username: string | null;
};

type ClassRow = {
  id: number;
  class_name: string;
  level: string | null;
};

type TeacherClassRow = {
  id: number;
  teacher_id: string;
  class_id: number;
};

export default function AdminTeacherClassesPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [assignments, setAssignments] = useState<TeacherClassRow[]>([]);
  const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});
  const [classMap, setClassMap] = useState<Record<number, string>>({});

  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");

  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    setMessage("");

    const { data: teacherData, error: teacherError } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("role", "teacher")
      .order("username", { ascending: true });

    if (teacherError) {
      setMessage(teacherError.message);
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
      setLoading(false);
      return;
    }

    const { data: assignmentData, error: assignmentError } = await supabase
      .from("teacher_classes")
      .select("id, teacher_id, class_id")
      .order("id", { ascending: false });

    if (assignmentError) {
      setMessage(assignmentError.message);
      setLoading(false);
      return;
    }

    const teacherRows = (teacherData || []) as TeacherRow[];
    const classRows = (classData || []) as ClassRow[];
    const assignmentRows = (assignmentData || []) as TeacherClassRow[];

    const newTeacherMap: Record<string, string> = {};
    teacherRows.forEach((teacher) => {
      newTeacherMap[teacher.id] = teacher.username || "Unnamed Teacher";
    });

    const newClassMap: Record<number, string> = {};
    classRows.forEach((cls) => {
      newClassMap[cls.id] = `${cls.class_name}${cls.level ? ` • ${cls.level}` : ""}`;
    });

    setTeachers(teacherRows);
    setClasses(classRows);
    setAssignments(assignmentRows);
    setTeacherMap(newTeacherMap);
    setClassMap(newClassMap);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const assignClass = async () => {
    setMessage("");

    if (!teacherId) {
      setMessage("Please select a teacher.");
      return;
    }

    if (!classId) {
      setMessage("Please select a class.");
      return;
    }

    setAssigning(true);

    const { error } = await supabase.from("teacher_classes").insert({
      teacher_id: teacherId,
      class_id: Number(classId),
    });

    if (error) {
      setMessage(error.message);
      setAssigning(false);
      return;
    }

    setMessage("Class assigned to teacher.");
    setTeacherId("");
    setClassId("");
    setAssigning(false);
    loadData();
  };

  const removeAssignment = async (assignmentId: number) => {
    const ok = window.confirm("Remove this teacher-class assignment?");
    if (!ok) return;

    setMessage("");

    const { error } = await supabase
      .from("teacher_classes")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Assignment removed.");
    loadData();
  };

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Teacher Classes</h1>
            <p className="text-sm mt-1">
              Assign teachers to classes and manage current assignments.
            </p>
          </div>

          <div className="bg-yellow-50 border border-black rounded-xl p-4 mb-6">
            <h2 className="text-xl font-bold mb-4">Assign Class to Teacher</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Teacher</label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full p-3 rounded-lg border border-black bg-white"
                >
                  <option value="">Select teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.username || "Unnamed Teacher"}
                    </option>
                  ))}
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
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name} {cls.level ? `• ${cls.level}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={assignClass}
                disabled={assigning}
                className="px-4 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 transition disabled:opacity-60"
              >
                {assigning ? "Assigning..." : "Assign"}
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
              Loading assignments...
            </div>
          ) : assignments.length === 0 ? (
            <div className="border border-dashed border-black rounded-lg p-8 text-center">
              No teacher-class assignments found.
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-yellow-50 border border-black rounded-xl p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div>
                      <div className="text-xs opacity-70">Teacher</div>
                      <div className="font-bold text-lg">
                        {teacherMap[assignment.teacher_id] || assignment.teacher_id}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs opacity-70">Class</div>
                      <div className="font-bold">
                        {classMap[assignment.class_id] || assignment.class_id}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs opacity-70">Assignment ID</div>
                      <div className="font-bold">{assignment.id}</div>
                    </div>

                    <div className="flex justify-start md:justify-end">
                      <button
                        onClick={() => removeAssignment(assignment.id)}
                        className="px-3 py-2 rounded-lg border border-black bg-red-500 text-white hover:bg-red-600 transition font-bold"
                      >
                        Remove
                      </button>
                    </div>
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