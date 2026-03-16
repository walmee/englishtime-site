"use client";

import { useEffect, useState } from "react";
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

export default function AdminWorksheetsPage() {
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

  const loadData = async () => {
    setLoading(true);
    setMessage("");

    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, class_name, level")
      .eq("is_active", true)
      .order("class_name", { ascending: true });

    if (classError) {
      setMessage(classError.message);
      setClasses([]);
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
      .order("created_at", { ascending: false });

    if (worksheetError) {
      setMessage(worksheetError.message);
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
    setMessage("");

    const safeTitle = title.trim();
    if (!safeTitle) {
      setMessage("Worksheet başlığı zorunlu.");
      return;
    }

    if (!classId) {
      setMessage("Lütfen bir sınıf seç.");
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
      class_id: Number(classId),
      created_by: user?.id || null,
      due_date: dueDate || null,
    });

    if (error) {
      setMessage(error.message);
      setCreating(false);
      return;
    }

    setMessage("Worksheet oluşturuldu.");
    setTitle("");
    setDescription("");
    setFileUrl("");
    setClassId("");
    setDueDate("");
    setCreating(false);
    loadData();
  };

  const deleteWorksheet = async (worksheetId: number, worksheetTitle: string) => {
    const ok = window.confirm(
      `"${worksheetTitle}" worksheet silinsin mi?`
    );
    if (!ok) return;

    setMessage("");

    const { error } = await supabase
      .from("worksheets")
      .delete()
      .eq("id", worksheetId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Worksheet silindi.");
    loadData();
  };

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Worksheets</h1>
            <p className="text-sm mt-1">
              Sınıflara çalışma kağıdı ve ödev gönder.
            </p>
          </div>

          <div className="bg-yellow-50 border border-black rounded-xl p-4 mb-6">
            <h2 className="text-xl font-bold mb-4">Yeni Worksheet Oluştur</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Başlık</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 rounded-lg border border-black bg-white"
                  placeholder="Örn: Unit 5 Grammar Worksheet"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Sınıf</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full p-3 rounded-lg border border-black bg-white"
                >
                  <option value="">Sınıf seç</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name} • {cls.level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Dosya Linki</label>
                <input
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full p-3 rounded-lg border border-black bg-white"
                  placeholder="PDF veya Drive linki"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Son Teslim Tarihi</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-3 rounded-lg border border-black bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-1">Açıklama</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-lg border border-black bg-white min-h-[120px]"
                  placeholder="Worksheet hakkında kısa açıklama"
                />
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={createWorksheet}
                disabled={creating}
                className="px-4 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 transition disabled:opacity-60"
              >
                {creating ? "Oluşturuluyor..." : "Worksheet Oluştur"}
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
              Henüz worksheet yok.
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
                        <div className="text-sm mt-1 opacity-80">
                          {worksheet.description}
                        </div>
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
                      <div className="font-bold">
                        {worksheet.due_date || "-"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                      {worksheet.file_url ? (
                        <a
                          href={worksheet.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition font-bold"
                        >
                          Aç
                        </a>
                      ) : null}

                      <button
                        onClick={() =>
                          deleteWorksheet(worksheet.id, worksheet.title)
                        }
                        className="px-3 py-2 rounded-lg border border-black bg-red-500 text-white hover:bg-red-600 transition font-bold"
                      >
                        Sil
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