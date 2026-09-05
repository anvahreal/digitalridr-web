import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from './useProfile';

export interface Booking {
    id: string;
    listing_id: string;
    guest_id: string;
    host_id: string;
    user_id: string;
    check_in: string;
    check_out: string;
    total_price: number;
    security_deposit?: number;
    platform_fee?: number;
    host_payout_amount?: number;
    payment_status?: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    guests: number;
    created_at: string;
    listing?: {
        title: string;
        location: string;
        images: string[];
    };
    profiles?: {
        full_name: string;
        email?: string;
        avatar_url: string;
        verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
    };
    start_date: string; // Legacy support if needed
    end_date: string;
}

export function useHostBookings() {
    const { user } = useProfile();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBookings = async () => {
        if (!user) return;
        try {
            setLoading(true);

            // NEW APPROACH: Query directly by host_id (made possible by new RLS and FKs)
            const { data: bookingsData, error: bookingsError } = await supabase
                .from('bookings')
                .select('*, listing:listings(title, images), profiles:guest_id(full_name, email, avatar_url, verification_status)')
                .eq('host_id', user.id)
                .order('created_at', { ascending: false });

            if (bookingsError) throw bookingsError;

            if (bookingsData) {
                setBookings(bookingsData as any);
            }
        } catch (err: any) {
            console.error("Error fetching bookings:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, [user]);

    return { bookings, loading, error, refetch: fetchBookings };
}
