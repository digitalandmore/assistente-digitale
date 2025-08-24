import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    'https://uczhhyjytabcqhznozgc.supabase.co',
    process.env.SUPABASE_SECRET_API_KEY
)

export default supabase;