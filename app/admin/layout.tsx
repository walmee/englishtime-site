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
        (async () => {
            // 1) auth user var mı?
            const { data: auth } = await supabase.auth.getUser();
            const user = auth.user;

            if (!user) {
                router.replace('/login');
                return;
            }

            // 2) profiles.role admin mi?
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

            // admin OK
            setWho(profile.username || user.email || 'admin');
            setLoading(false);
        })();
    }, [router]);

    const logout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('student_id');
        router.replace('/login');
    };

    const tabClass = (href: string) => {
        const active = pathname === href || pathname?.startsWith(href + '/');
        return `px-4 py-2 rounded-lg border border-black transition ${active ? 'bg-yellow-500 font-bold' : 'bg-yellow-300 hover:bg-yellow-400'
            }`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-yellow-300 text-black flex items-center justify-center">
                <div className="bg-yellow-100 border border-black rounded-xl p-6">
                    <b>Loading admin panel...</b>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-yellow-300 text-black">
            <header className="border-b border-black bg-yellow-200">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">Admin Panel</h1>
                        <p className="text-xs">Signed in as: <b>{who}</b></p>
                    </div>

                    <div className="flex gap-3 items-center">
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

                <div className="max-w-6xl mx-auto px-6 pb-4 flex gap-3">
                   <Link href="/admin" className={tabClass('/admin')}>Overview</Link>
<Link href="/admin/quizzes" className={tabClass('/admin/quizzes')}>Quizzes</Link>
<Link href="/admin/questions" className={tabClass('/admin/questions')}>Questions</Link>
<Link href="/admin/classes" className={tabClass('/admin/classes')}>Classes</Link>
<Link href="/admin/users" className={tabClass('/admin/users')}>Students</Link>
<Link href="/admin/worksheets" className={tabClass('/admin/worksheets')}>Worksheets</Link>
<Link href="/admin/leaderboard" className={tabClass('/admin/leaderboard')}>Leaderboard</Link>
<Link href="/admin/tools" className={tabClass('/admin/tools')}>Tools</Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
        </div>
    );
}
