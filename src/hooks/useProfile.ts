import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/listing';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  selfie_url?: string | null;
  date_of_birth?: string | null;
  phone_number?: string | null;
  is_host: boolean;
  host_status: 'pending' | 'approved' | 'rejected' | 'none';
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  is_admin: boolean;
  updated_at: string | null;
}

export function useProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function getProfile() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user && mounted) {
          // Initial user state from Auth (minimal)
          const InitialUser: User = {
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata.full_name || '',
            avatar_url: user.user_metadata.avatar_url,
            is_host: false,
            host_status: 'none',
            verification_status: 'unverified',
            is_admin: false,
            created_at: user.created_at,
          };
          setUser(InitialUser);

          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, selfie_url, date_of_birth, phone_number, website, is_host, host_status, verification_status, is_admin, updated_at')
            .eq('id', user.id)
            .single();

          if (error) {
            console.warn('Error fetching profile, using auth metadata:', error.message);
          }

          if (data && mounted) {
            setProfile(data as Profile); // Type assertion needed until Supabase types are fully synced
            // Update user object with profile data
            setUser(prev => prev ? ({
              ...prev,
              full_name: data.full_name || prev.full_name,
              avatar_url: data.avatar_url || prev.avatar_url,
              is_host: data.is_host,
              host_status: data.host_status,
              verification_status: (data as any).verification_status || 'unverified',
              is_admin: data.is_admin,
            }) : null);
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    getProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && mounted) {
        // Re-fetch profile on auth change
        getProfile();
      } else if (mounted) {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update local state
      setProfile(prev => {
        if (prev) return { ...prev, ...updates };
        return {
          id: user.id,
          full_name: updates.full_name || null,
          avatar_url: updates.avatar_url || null,
          is_host: false,
          host_status: 'none',
          verification_status: 'unverified',
          is_admin: false,
          updated_at: new Date().toISOString()
        };
      });

      setUser(prev => {
        if (prev) return {
          ...prev,
          full_name: updates.full_name || prev.full_name,
          avatar_url: updates.avatar_url || prev.avatar_url
        };
        if (user) return {
          id: user.id,
          email: user.email!,
          full_name: updates.full_name || user.user_metadata.full_name || '',
          avatar_url: updates.avatar_url || user.user_metadata.avatar_url,
          is_host: false,
          host_status: 'none',
          verification_status: 'unverified',
          is_admin: false,
          created_at: user.created_at,
        };
        return null;
      });

    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return { user, profile, loading, error, updateProfile };
}
