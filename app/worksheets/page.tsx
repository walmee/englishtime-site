'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

type WorksheetRow = {
  id: number;
  title: string;
  description?: string | null;
  file_url?: string | null;
  class_id?: number | null;
  created_at?: string | null;
};

export default function WorksheetsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [worksheets, setWorksheets] = useState<WorksheetRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/login');
        return;
      }

      const userId = session.user.id;

      // 1) öğrencinin class_id bilgisini al
      const { data: classStudent, error: classStudentError } = await supabase
        .from('class_students')
        .select('class_id')
        .eq('student_id', userId)
        .single();

      if (!mounted) return;

      if (classStudentError || !classStudent) {
        setError(classStudentError?.message || 'Student class not found');
        setWorksheets([]);
        setLoading(false);
        return;
      }

      // 2) sadece kendi sınıfına ait worksheetleri çek
      const { data, error } = await supabase
        .from('worksheets')
        .select('id, title, description, file_url, class_id, created_at')
        .eq('class_id', classStudent.class_id)
        .order('id', { ascending: false });

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setWorksheets([]);
        setLoading(false);
        return;
      }

      setWorksheets(Array.isArray(data) ? (data as WorksheetRow[]) : []);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-yellow-300 text-black">
      <header className="border-b border-black bg-yellow-200 w-full overflow-x-hidden">
        <div className="w-full px-3 py-4 md:max-w-6xl md:mx-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h1 className="text-xl font-bold">Language Learning</h1>

            <nav className="flex flex-wrap gap-2">
              <Link
                className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
                href="/dashboard"
              >
                Dashboard
              </Link>

              <Link
                className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
                href="/take-test"
              >
                Take Test
              </Link>

              <Link
                className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
                href="/history"
              >
                History
              </Link>

              <Link
                className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
                href="/progress"
              >
                Progress
              </Link>

              <Link
                className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
                href="/leaderboard"
              >
                Leaderboard
              </Link>

              <Link
                className="px-4 py-2 rounded-lg border border-black bg-yellow-500 font-bold"
                href="/worksheets"
              >
                Worksheets
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto">
        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-2">Worksheets</h2>
          <p className="mb-6">Download the worksheets shared for your class.</p>

          {error ? (
            <div className="mb-4 bg-red-100 border border-black rounded-xl p-4">
              <p className="font-bold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : null}

          {loading ? (
            <div className="border border-dashed border-black rounded-lg p-6 text-center">
              Loading worksheets...
            </div>
          ) : worksheets.length === 0 ? (
            <div className="border border-dashed border-black rounded-lg p-6 text-center">
              No worksheets available for your class yet.
            </div>
          ) : (
            <div className="space-y-4">
              {worksheets.map((w) => (
                <div key={w.id} className="bg-yellow-50 border border-black rounded-xl p-4">
                  <h3 className="text-lg font-bold">{w.title}</h3>

                  {w.description ? (
                    <p className="mt-1 text-sm opacity-90">{w.description}</p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3">
                    {w.file_url ? (
                      <a
                        href={w.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-800 transition"
                      >
                        Open PDF
                      </a>
                    ) : (
                      <span className="px-4 py-2 rounded-lg border border-black bg-gray-200">
                        No PDF
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs opacity-70">
                    {w.created_at ? new Date(w.created_at).toLocaleString() : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}