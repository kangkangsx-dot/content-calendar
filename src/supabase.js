import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wrrvbbsenwixxmkvpjhv.supabase.co'
const supabaseKey = 'sb_publishable_OQZyzOpsgzdLT5yVAyHxGw_T9r57zHo'

export const supabase = createClient(supabaseUrl, supabaseKey)
