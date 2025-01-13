'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import Auth from '../../components/Auth';

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already signed in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // If user is already signed in, redirect to home
        router.push('/');
      }
    };

    checkUser();
  }, [router]);

  return <Auth />;
} 