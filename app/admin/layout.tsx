'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

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
          .select('role')
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
      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}