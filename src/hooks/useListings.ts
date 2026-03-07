import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Listing, SearchFilters } from '@/types/listing';

interface UseListingsReturn {
    listings: Listing[];
    loading: boolean;
    error: string | null;
    filters: SearchFilters;
    setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
}

const initialFilters: SearchFilters = {
    location: '',
    checkIn: null,
    checkOut: null,
    guests: 1,
    priceMin: 0,
    priceMax: 1000000,
    bedrooms: 0,
    propertyType: '',
    amenities: [],
};

export function useListings(): UseListingsReturn {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<SearchFilters>(initialFilters);

    useEffect(() => {
        let mounted = true;

        async function fetchListings() {
            try {
                setLoading(true);
                let query = supabase.from('listings').select('*').order('created_at', { ascending: false });

                if (filters.location) {
                    query = query.ilike('location', `%${filters.location}%`);
                }

                // Note: For date availability, a more complex join with bookings would be needed.
                // Keeping it simple for now based on properties.

                if (filters.guests > 1) {
                    query = query.gte('max_guests', filters.guests);
                }

                if (filters.priceMax < 1000000) {
                    query = query.lte('price_per_night', filters.priceMax);
                }

                if (filters.priceMin > 0) {
                    query = query.gte('price_per_night', filters.priceMin);
                }

                const { data, error } = await query;

                if (error) {
                    throw error;
                }

                if (data && mounted) {
                    // Ensure data matches Listing interface, filling optional missing fields if legacy data
                    const typedListings: Listing[] = data.map(item => ({
                        ...item,
                        images: item.images || [],
                        amenities: item.amenities || []
                    }));
                    setListings(typedListings);
                }
            } catch (err: any) {
                if (mounted) setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchListings();

        return () => {
            mounted = false;
        };
    }, [filters]); // Re-fetch when filters change

    return { listings, loading, error, filters, setFilters };
}

export function useListing(id: string | undefined) {
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        let mounted = true;

        async function fetchListing() {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('listings')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                if (data && mounted) {
                    // Fetch host profile
                    const { data: hostData } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url')
                        .eq('id', data.host_id)
                        .single();

                    setListing({
                        ...data,
                        images: data.images || [],
                        amenities: data.amenities || [],
                        house_rules: data.house_rules || [],
                        host_name: hostData?.full_name || 'Host',
                        host_avatar: hostData?.avatar_url || '',
                        host_logo: data.host_logo || null
                    });
                }
            } catch (err: any) {
                if (mounted) setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        fetchListing();

        return () => { mounted = false; };
    }, [id]);

    return { listing, loading, error };
}
