'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

type ResultRow = {
  student_id: string;
  quiz_id: number;
  score: number;
  created_at?: string | null;
};

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileLevel, setProfileLevel] = useState('');
  const [results, setResults] = useState<ResultRow[] | undefined>([]);
  const [error, setError] = useState('');

  const safeResults: ResultRow[] = Array.isArray(results) ? results : [];

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, level')
        .eq('id', user.id)
        .single();

      if (!mounted) return;

      if (error || !profile) {
        router.push('/login');
        return;
      }

      const username = profile.username || user.email || 'Student';

      setUserId(user.id);
      setProfileName(username);
      setProfileLevel(profile.level || 'A1');
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('leaderboard')
        .select('student_id, quiz_id, score, created_at')
        .eq('student_id', userId)
        .limit(10);

      if (cancelled) return;

      if (error) {
        if (!error.message.toLowerCase().includes('abort')) {
          setError(error.message);
        }
        setResults([]);
        setLoading(false);
        return;
      }

      setResults(Array.isArray(data) ? (data as ResultRow[]) : []);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const testsCompleted = safeResults.length;

  const avgScore = useMemo(() => {
    if (!safeResults.length) return 0;
    const sum = safeResults.reduce((acc, r) => acc + (Number(r.score) || 0), 0);
    return Math.round((sum / safeResults.length) * 10) / 10;
  }, [safeResults]);

  const refresh = async () => {
    if (!userId) return;

    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('leaderboard')
      .select('student_id, quiz_id, score, created_at')
      .eq('student_id', userId)
      .limit(10);

    if (error) {
      if (!error.message.toLowerCase().includes('abort')) {
        setError(error.message);
      }
      setResults([]);
      setLoading(false);
      return;
    }

    setResults(Array.isArray(data) ? (data as ResultRow[]) : []);
    setLoading(false);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }

    localStorage.removeItem('student_id');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('admin_email');

    router.replace('/login');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-yellow-300 text-black">
      <header className="border-b border-black bg-yellow-200 w-full overflow-x-hidden">
        <div className="w-full px-3 py-4 md:max-w-6xl md:mx-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h1 className="text-xl font-bold">Language Learning</h1>

            <nav className="flex flex-wrap gap-2">
              <Link
                className="px-4 py-2 rounded-lg border border-black bg-yellow-500 font-bold"
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
                href="/change-password"
                className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
              >
                Change Password
              </Link>

              <button
                onClick={logout}
                className="px-4 py-2 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-800 transition"
              >
                Logout
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto overflow-x-hidden">
        <h2 className="text-2xl font-bold mb-2 break-words">
          Welcome back, {profileName}!
        </h2>
        <p className="mb-6">Track your progress and continue learning.</p>

        {error ? (
          <div className="mb-6 bg-red-100 border border-black rounded-xl p-4">
            <p className="font-bold">Error</p>
            <p className="text-sm break-words">{error}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-yellow-100 border border-black rounded-xl p-6">
            <h3 className="font-semibold mb-2">Average Score</h3>
            <p className="text-3xl font-bold">{loading ? '...' : `${avgScore}%`}</p>
            <p className="text-sm">Across all tests</p>
          </div>

          <div className="bg-yellow-100 border border-black rounded-xl p-6">
            <h3 className="font-semibold mb-2">Tests Completed</h3>
            <p className="text-3xl font-bold">{loading ? '...' : testsCompleted}</p>
            <p className="text-sm">Total assessments</p>
          </div>

          <div className="bg-yellow-100 border border-black rounded-xl p-6">
            <h3 className="font-semibold mb-2">Current Level</h3>
            <p className="text-3xl font-bold">{loading ? '...' : profileLevel}</p>
            <p className="text-sm">Language proficiency</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-yellow-100 border border-black rounded-xl p-6">
            <h3 className="font-semibold mb-4">Quick Start</h3>
            <Link
              href="/take-test"
              className="block w-full text-center bg-black text-yellow-300 font-bold py-3 rounded-lg hover:bg-gray-800 transition"
            >
              Start New Test →
            </Link>

            <ul className="mt-4 text-sm list-disc list-inside">
              <li>10 multiple-choice questions</li>
              <li>10 minutes time limit</li>
              <li>Instant results after finishing</li>
            </ul>
          </div>

          <div className="bg-yellow-100 border border-black rounded-xl p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold">Recent Tests</h3>
              <button
                onClick={refresh}
                className="px-3 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition text-sm shrink-0"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="border border-dashed border-black rounded-lg p-6 text-center">
                <p>Loading...</p>
              </div>
            ) : safeResults.length === 0 ? (
              <div className="border border-dashed border-black rounded-lg p-6 text-center">
                <p>No tests completed yet</p>
                <p className="text-sm mt-1">Take your first test to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {safeResults.slice(0, 5).map((r) => (
                  <div
                    key={`${r.student_id}-${r.quiz_id}`}
                    className="border border-black rounded-lg bg-yellow-50 p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">Score: {r.score}%</p>
                      <p className="text-xs break-words">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : 'No date'}
                      </p>
                    </div>

                    <span className="text-xs px-2 py-1 rounded-md border border-black bg-yellow-200 shrink-0">
                      Quiz #{r.quiz_id}
                    </span>
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