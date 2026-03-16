'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [who, setWho] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;

        if (!user) {
          router.replace('/login');
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, username')
          .eq('id', user.id)
          .single();

        if (error || !profile) {
          router.replace('/dashboard');
          return;
        }

        const role = (profile.role || 'student').toLowerCase();

        if (role !== 'admin') {
          router.replace('/dashboard');
          return;
        }

        if (mounted) {
          setWho(profile.username || user.email || 'admin');
          setLoading(false);
        }
      } catch {
        router.replace('/login');
      }
    };

    checkAdmin();

    return () => {
      mounted = false;
    };
  }, [router]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}

    localStorage.removeItem('student_id');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('admin_email');

    router.replace('/login');
    window.location.href = '/login';
  };

  const tabClass = (href: string) => {
    const active = pathname === href || pathname?.startsWith(href + '/');
    return `px-4 py-2 rounded-lg border border-black transition whitespace-nowrap ${
      active ? 'bg-yellow-500 font-bold' : 'bg-yellow-300 hover:bg-yellow-400'
    }`;
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-yellow-300 text-black flex items-center justify-center p-6">
        <div className="bg-yellow-100 border border-black rounded-xl p-6">
          <b>Loading admin panel...</b>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-yellow-300 text-black">
      <header className="border-b border-black bg-yellow-200 w-full overflow-x-hidden">
        <div className="w-full px-3 py-4 md:max-w-6xl md:mx-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-bold">Admin Panel</h1>
              <p className="text-xs break-words">
                Signed in as: <b>{who}</b>
              </p>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
              >
                Student View
              </Link>

              <button
                onClick={logout}
                className="px-4 py-2 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-800 transition"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/admin" className={tabClass('/admin')}>
              Overview
            </Link>
            <Link href="/admin/quizzes" className={tabClass('/admin/quizzes')}>
              Quizzes
            </Link>
            <Link href="/admin/questions" className={tabClass('/admin/questions')}>
              Questions
            </Link>
            <Link href="/admin/classes" className={tabClass('/admin/classes')}>
              Classes
            </Link>
            <Link href="/admin/users" className={tabClass('/admin/users')}>
              Students
            </Link>
            <Link href="/admin/worksheets" className={tabClass('/admin/worksheets')}>
              Worksheets
            </Link>
            <Link href="/admin/leaderboard" className={tabClass('/admin/leaderboard')}>
              Leaderboard
            </Link>
            <Link href="/admin/tools" className={tabClass('/admin/tools')}>
              Tools
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}