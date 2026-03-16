'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

type ResultRow = {
  id: number;
  student_id: string;
  score: number;
  created_at: string;
};

export default function ProgressPage() {
  const router = useRouter();

  const [studentId, setStudentId] = useState('');
  const [results, setResults] = useState<ResultRow[] | undefined>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const safeResults: ResultRow[] = Array.isArray(results) ? results : [];

  // ✅ LOGIN GUARD
  useEffect(() => {
    const sid = (localStorage.getItem('student_id') || '').trim();
    if (!sid) {
      router.push('/login');
      return;
    }
    setStudentId(sid);
  }, [router]);

  useEffect(() => {
    if (!studentId) return;

    const load = async () => {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('results')
        .select('id, student_id, score, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true });

      if (error) {
        setError(error.message);
        setResults([]);
        setLoading(false);
        return;
      }

      setResults(Array.isArray(data) ? (data as ResultRow[]) : []);
      setLoading(false);
    };

    load();
  }, [studentId]);

  const avg = useMemo(() => {
    if (!safeResults.length) return 0;
    const s = safeResults.reduce((a, r) => a + (Number(r.score) || 0), 0);
    return Math.round((s / safeResults.length) * 10) / 10;
  }, [safeResults]);

  const last5 = useMemo(() => safeResults.slice(-5), [safeResults]);

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('student_id');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <header className="border-b border-black bg-yellow-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Language Learning</h1>

          <nav className="flex gap-3 items-center">
            <Link className="px-4 py-2 border border-black rounded-lg bg-yellow-300 hover:bg-yellow-400 transition" href="/dashboard">Dashboard</Link>
            <Link className="px-4 py-2 border border-black rounded-lg bg-yellow-300 hover:bg-yellow-400 transition" href="/take-test">Take Test</Link>
            <Link className="px-4 py-2 border border-black rounded-lg bg-yellow-300 hover:bg-yellow-400 transition" href="/history">History</Link>
            <Link className="px-4 py-2 border border-black rounded-lg bg-yellow-500 font-bold" href="/progress">Progress</Link>
            <Link className="px-4 py-2 border border-black rounded-lg bg-yellow-300 hover:bg-yellow-400 transition" href="/leaderboard">Leaderboard</Link>

            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-800 transition"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold mb-2">Progress</h2>
        <p className="mb-6 text-sm">
          Student: <b>{studentId}</b>
        </p>

        {error ? (
          <div className="mb-6 bg-red-100 border border-black rounded-xl p-4">
            <p className="font-bold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-yellow-100 border border-black rounded-xl p-6">
            <h3 className="font-semibold mb-2">Average Score</h3>
            <p className="text-3xl font-bold">{loading ? '...' : `${avg}%`}</p>
            <p className="text-sm">Across all attempts</p>
          </div>

          <div className="bg-yellow-100 border border-black rounded-xl p-6">
            <h3 className="font-semibold mb-4">Last 5 Attempts</h3>

            {loading ? (
              <div className="border border-dashed border-black rounded-lg p-6 text-center">Loading...</div>
            ) : last5.length === 0 ? (
              <div className="border border-dashed border-black rounded-lg p-6 text-center">No data yet.</div>
            ) : (
              <div className="space-y-3">
                {last5.map((r) => (
                  <div key={r.id} className="bg-yellow-50 border border-black rounded-lg p-4 flex justify-between">
                    <div>
                      <p className="font-bold">{r.score}%</p>
                      <p className="text-xs">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <span className="text-xs px-3 py-1 border border-black rounded bg-yellow-200">#{r.id}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
