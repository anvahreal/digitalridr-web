ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS minimum_nights integer DEFAULT 1;
NOTIFY pgrst, 'reload schema';
