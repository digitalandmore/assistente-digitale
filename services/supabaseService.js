import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    'https://uczhhyjytabcqhznozgc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjemhoeWp5dGFiY3Foem5vemdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTc2MTY5MCwiZXhwIjoyMDcxMzM3NjkwfQ.gU4ib-v8oNV4rif8g-6RsNHhLD9BZQkhKUlzm_cW3N4'
)

export default supabase;