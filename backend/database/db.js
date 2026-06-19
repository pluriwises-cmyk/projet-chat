// backend/database/db.js
const { createClient } = require('@supabase/supabase-js');

// ==========================================
// 1. VÉRIFICATION STRICTE DES VARIABLES
// ==========================================
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ ERREUR FATALE : Variables Supabase manquantes dans l\'environnement.');
    console.error('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌');
    console.error('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅' : '❌');
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
console.log('✅ Connecté à Supabase avec succès');

const db = {};

// ==========================================
// 2. FONCTION DE GESTION DES ERREURS
// ==========================================
const handleSupabaseError = (err, callback) => {
    console.error('❌ Erreur Supabase:', err);
    if (callback) callback(err, null);
};

// ==========================================
// 3. FONCTIONS CRUD ABSTRAITES
// ==========================================

// === db.get : Récupère une seule ligne ===
db.get = (sql, params, callback) => {
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }
    try {
        const tableName = extractTableName(sql);
        if (!tableName) {
            console.error('❌ Table non trouvée dans la requête:', sql);
            return callback(new Error('Table non trouvée'), null);
        }

        let query = supabase.from(tableName).select('*');

        // Gestion du OR pour auth (email OR telephone)
        const isAuthTable = ['personnel', 'beneficiaire'].includes(tableName);
        if (sql.toUpperCase().includes('OR') && isAuthTable && params.length > 0) {
            query = query.or(`email.eq.${params[0]},telephone.eq.${params[0]}`);
        } else {
            const conditions = extractWhereConditions(sql);
            conditions.forEach((cond, i) => {
                if (params[i] !== undefined) {
                    query = query.eq(cond.column, params[i]);
                }
            });
        }

        // ✅ Détection du LIMIT 1 ou .single()
        const hasLimit1 = /LIMIT\s+1/i.test(sql);
        const hasSingle = /\.single\(\)/i.test(sql);

        if (hasLimit1 || hasSingle) {
            // Retourne un seul résultat ou null
            query.maybeSingle().then(({ data, error }) => {
                if (error) {
                    console.error('❌ Erreur db.get:', error);
                    return callback(error, null);
                }
                callback(null, data || null);
            });
        } else {
            // Retourne toujours un tableau
            query.then(({ data, error }) => {
                if (error) {
                    console.error('❌ Erreur db.get:', error);
                    return callback(error, null);
                }
                callback(null, data || []);
            });
        }
    } catch (err) {
        console.error('❌ Erreur db.get:', err);
        callback(err, null);
    }
};

// === db.all : Récupère plusieurs lignes ===
db.all = (sql, params, callback) => {
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }
    try {
        const tableName = extractTableName(sql);
        if (!tableName) {
            console.error('❌ Table non trouvée dans la requête:', sql);
            return callback(new Error('Table non trouvée'), null);
        }

        let query = supabase.from(tableName).select('*');

        // Support ORDER BY
        const orderMatch = sql.match(/ORDER BY\s+([a-zA-Z0-9_]+)\s*(DESC|ASC)?/i);
        if (orderMatch) {
            const column = orderMatch[1];
            const ascending = orderMatch[2] ? orderMatch[2].toUpperCase() !== 'DESC' : true;
            query = query.order(column, { ascending });
        }

        // Support LIMIT
        const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) {
            query = query.limit(parseInt(limitMatch[1]));
        }

        query.then(({ data, error }) => {
            if (error) {
                handleSupabaseError(error, callback);
            } else {
                callback(null, data || []);
            }
        });
    } catch (err) {
        console.error('❌ Erreur db.all:', err);
        callback(err, null);
    }
};

// === db.run : INSERT, UPDATE, DELETE ===
db.run = (sql, params, callback) => {
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }
    try {
        const tableName = extractTableName(sql);
        if (!tableName) {
            console.error('❌ Table non trouvée dans la requête:', sql);
            return callback(new Error('Table non trouvée'), null);
        }

        const sqlLower = sql.trim().toLowerCase();

        // --- INSERT ---
        if (sqlLower.startsWith('insert')) {
            const keys = extractInsertKeys(sql);
            const payload = {};
            keys.forEach((key, i) => {
                payload[key] = params[i] !== undefined ? params[i] : null;
            });

            supabase.from(tableName).insert(payload).select().then(({ data, error }) => {
                if (error) {
                    handleSupabaseError(error, callback);
                } else {
                    const firstItem = data?.[0] || {};
                    const idKey = Object.keys(firstItem).find(k => k.includes('id')) || 'id';
                    const lastID = firstItem[idKey] || 0;
                    callback(null, { lastID });
                }
            });

        // --- UPDATE ---
        } else if (sqlLower.startsWith('update')) {
            const updateData = extractUpdateData(sql);
            const conditions = extractWhereConditions(sql);
            
            if (conditions.length === 0) {
                return callback(new Error('UPDATE sans condition WHERE non supporté'), null);
            }

            let query = supabase.from(tableName).update(updateData);
            
            const paramStart = Object.keys(updateData).length;
            conditions.forEach((cond, i) => {
                const paramIndex = paramStart + i;
                if (params[paramIndex] !== undefined) {
                    query = query.eq(cond.column, params[paramIndex]);
                }
            });

            query.then(({ error, count }) => {
                if (error) {
                    handleSupabaseError(error, callback);
                } else {
                    callback(null, { changes: count || 0 });
                }
            });

        // --- DELETE ---
        } else if (sqlLower.startsWith('delete')) {
            const conditions = extractWhereConditions(sql);
            
            if (conditions.length === 0) {
                return callback(new Error('DELETE sans condition WHERE non supporté'), null);
            }

            let query = supabase.from(tableName).delete();
            conditions.forEach((cond, i) => {
                if (params[i] !== undefined) {
                    query = query.eq(cond.column, params[i]);
                }
            });

            query.then(({ error, count }) => {
                if (error) {
                    handleSupabaseError(error, callback);
                } else {
                    callback(null, { changes: count || 0 });
                }
            });

        } else {
            callback(new Error('Action SQL non supportée: ' + sqlLower), null);
        }
    } catch (err) {
        console.error('❌ Erreur db.run:', err);
        callback(err, null);
    }
};

// ==========================================
// 4. FONCTIONS MÉTIER (WhatsApp & Logs)
// ==========================================

// === Sauvegarde d'un code WhatsApp ===
db.saveWhatsAppCode = (telephone, callback) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 2);

    console.log("📱 Insertion code WhatsApp pour:", telephone);

    supabase.from('whatsapp_validation').insert({
        telephone: telephone,
        code: code,
        statut: 'en_attente',
        date_expiration: expiration.toISOString(),
        date_envoi: new Date().toISOString(),
        tentative: 0
    }).select().then(({ data, error }) => {
        if (error) {
            console.error('❌ Erreur saveWhatsAppCode:', error);
            callback(error);
        } else {
            console.log("✅ Code WhatsApp inséré !");
            callback(null, { 
                id: data?.[0]?.id_validation || data?.[0]?.id || 0,
                code 
            });
        }
    });
};

// === Vérification d'un code WhatsApp ===
db.verifyWhatsAppCode = (telephone, code, callback) => {
    supabase.from('whatsapp_validation')
        .select('*')
        .eq('telephone', telephone)
        .eq('code', code)
        .eq('statut', 'en_attente')
        .gte('date_expiration', new Date().toISOString())
        .order('id_validation', { ascending: false })
        .limit(1)
        .then(({ data, error }) => {
            if (error) {
                console.error('❌ Erreur verifyWhatsAppCode:', error);
                callback(error);
            } else if (data && data.length > 0) {
                const row = data[0];
                supabase.from('whatsapp_validation')
                    .update({ 
                        statut: 'valide', 
                        date_validation: new Date().toISOString() 
                    })
                    .eq('id_validation', row.id_validation)
                    .then(() => {
                        callback(null, row);
                    });
            } else {
                callback(null, null);
            }
        });
};

// === Journalisation des actions ===
db.logAction = (userId, userType, action, ip, callback) => {
    supabase.from('logs_connexion').insert({
        id_utilisateur: userId,
        type_utilisateur: userType,
        action: action,
        ip: ip,
        date_action: new Date().toISOString()
    }).then(({ error }) => {
        if (error) {
            console.error('❌ Erreur logAction:', error);
            if (callback) callback(error);
        } else {
            if (callback) callback(null);
        }
    });
};

// ==========================================
// 5. UTILITAIRES DE PARSING
// ==========================================

function extractTableName(sql) {
    const match = sql.match(/(?:FROM|INTO|UPDATE|DELETE\s+FROM|INSERT\s+INTO)\s+([a-zA-Z0-9_]+)/i);
    return match ? match[1] : '';
}

function extractWhereConditions(sql) {
    const match = sql.match(/WHERE\s+(.+?)(?:\s+ORDER BY|\s+GROUP BY|\s+LIMIT|$)/i);
    if (!match) return [];
    
    const parts = match[1].split(/\s+AND\s+/i);
    return parts.map(part => {
        const compareMatch = part.match(/([a-zA-Z0-9_]+)\s*(=|>=|<=|>|<|LIKE)\s*(.+)/i);
        if (compareMatch) {
            const column = compareMatch[1].trim();
            const operator = compareMatch[2].trim();
            const value = compareMatch[3].trim().replace(/['"]/g, '');
            return { column, operator, value };
        }
        return null;
    }).filter(c => c !== null);
}

function extractInsertKeys(sql) {
    const match = sql.match(/INSERT\s+INTO\s+[a-zA-Z0-9_]+\s*\(([^)]+)\)/i);
    if (!match) return [];
    return match[1].split(',').map(s => s.trim());
}

function extractUpdateData(sql) {
    const match = sql.match(/SET\s+(.+?)(?:\s+WHERE|$)/i);
    if (!match) return {};
    
    const data = {};
    const parts = match[1].split(',');
    parts.forEach(part => {
        const kvMatch = part.match(/([a-zA-Z0-9_]+)\s*=\s*(.+)/i);
        if (kvMatch) {
            const key = kvMatch[1].trim();
            const value = kvMatch[2].trim().replace(/['"]/g, '');
            data[key] = value;
        }
    });
    return data;
}

module.exports = db;
