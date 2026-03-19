'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkTeacher = async () => {
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
          .select('role')
          .eq('id', user.id)
          .single();

        if (error || !profile) {
          router.replace('/dashboard');
          return;
        }

        const role = String(profile.role || 'student').toLowerCase();

        if (role !== 'teacher' && role !== 'admin') {
          router.replace('/dashboard');
          return;
        }

        if (mounted) {
          setLoading(false);
        }
      } catch {
        router.replace('/login');
      }
    };

    checkTeacher();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkTeacher();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-yellow-300 text-black flex items-center justify-center p-6">
        <div className="bg-yellow-100 border border-black rounded-xl p-6">
          <b>Loading teacher panel...</b>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-yellow-300 text-black">
      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}