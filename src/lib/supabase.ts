import { createClient } from '@supabase/supabase-js';

export const getSupabaseClient = () => {
    const url = localStorage.getItem('supabase_url');
    const key = localStorage.getItem('supabase_key');

    if (!url || !key) return null;

    return createClient(url, key);
};
