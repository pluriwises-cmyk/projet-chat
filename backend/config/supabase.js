const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ ERREUR : Variables Supabase manquantes !');
    console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('   SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌');
    throw new Error("Variables Supabase manquantes !");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('✅ Connexion Supabase centralisée');

module.exports = supabase;
