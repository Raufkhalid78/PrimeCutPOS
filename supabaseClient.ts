
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qcyctjmevjhbqyacmtya.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_z4EyTro6AzGhgJw0rlwi1g_-JHxAHbA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
