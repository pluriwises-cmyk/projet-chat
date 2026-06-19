// backend/config/supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Les variables d'environnement Supabase sont manquantes !");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('✅ Connexion Supabase centralisée');

module.exports = supabase;
