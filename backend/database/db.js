// backend/database/db.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://mtcumvngnalsozoufltk.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Y3Vtdm5nbmFsc296b3VmbHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODM4NDcsImV4cCI6MjA5NzM1OTg0N30.lBiqoKoAuDgdiYoqeQT1W6Qc_4oycLfrpRzzeFR_Ht8';

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Connecté à Supabase');

const db = {};

// ==========================================
// 1. FONCTIONS PRINCIPALES
// ==========================================

// Récupère une seule ligne
db.get = (sql, params, callback) => {
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }
    try {
        const tableName = extractTableName(sql);
        let query = supabase.from(tableName).select('*');

        if (sql.toUpperCase().includes('OR')) {
            query = query.or(`email.eq.${params[0]},telephone.eq.${params[0]}`);
        } else {
            const conditions = extractWhereConditions(sql);
            conditions.forEach(cond => {
                query = query.eq(cond.column, cond.value);
            });
        }

        query.limit(1).then(({ data, error }) => {
            if (error) {
                console.error('Erreur Supabase (get):', error);
                callback(error, null);
            } else {
                callback(null, data[0] || null);
            }
        });
    } catch (err) {
        console.error('Erreur db.get:', err);
        callback(err, null);
    }
};

// Récupère plusieurs lignes
db.all = (sql, params, callback) => {
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }
    try {
        const tableName = extractTableName(sql);
        supabase.from(tableName).select('*').then(({ data, error }) => {
            if (error) {
                console.error('Erreur Supabase (all):', error);
                callback(error, null);
            } else {
                callback(null, data);
            }
        });
    } catch (err) {
        console.error('Erreur db.all:', err);
        callback(err, null);
    }
};

// Exécute INSERT, UPDATE, DELETE
db.run = (sql, params, callback) => {
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }
    try {
        const tableName = extractTableName(sql);
        const sqlLower = sql.trim().toLowerCase();

        if (sqlLower.startsWith('insert')) {
            const keys = extractInsertKeys(sql);
            const insertPayload = {};
            keys.forEach((key, i) => {
                insertPayload[key] = params[i] !== undefined ? params[i] : null;
            });

            supabase.from(tableName).insert(insertPayload).then(({ data, error }) => {
                if (error) {
                    console.error('Erreur Supabase (run/insert):', error);
                    callback(error, null);
                } else {
                    callback(null, { lastID: data?.[0]?.id || 0 });
                }
            });
        } else if (sqlLower.startsWith('update')) {
            const updateData = extractUpdateData(sql);
            const conditions = extractWhereConditions(sql);
            let query = supabase.from(tableName).update(updateData);
            const paramIndex = Object.keys(updateData).length;
            conditions.forEach((c, i) => {
                query = query.eq(c.column, params[paramIndex + i]);
            });
            query.then(({ error }) => {
                if (error) {
                    console.error('Erreur Supabase (run/update):', error);
                    callback(error, null);
                } else {
                    callback(null, { changes: 1 });
                }
            });
        } else if (sqlLower.startsWith('delete')) {
            const conditions = extractWhereConditions(sql);
            let query = supabase.from(tableName).delete();
            conditions.forEach((c, i) => {
                query = query.eq(c.column, params[i]);
            });
            query.then(({ error }) => {
                if (error) {
                    console.error('Erreur Supabase (run/delete):', error);
                    callback(error, null);
                } else {
                    callback(null, { changes: 1 });
                }
            });
        } else {
            callback(new Error('Requête non supportée'), null);
        }
    } catch (err) {
        console.error('Erreur db.run:', err);
        callback(err, null);
    }
};

// ==========================================
// 2. FONCTIONS WHATSAPP
// ==========================================

db.saveWhatsAppCode = (telephone, callback) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 2);

    console.log("DEBUG: Insertion code WhatsApp pour:", telephone);

    supabase.from('whatsapp_validation').insert({
        telephone: telephone,
        code: code,
        date_expiration: expiration.toISOString(),
        date_envoi: new Date().toISOString(),
        statut: 'en_attente',
        tentative: 0
    }).then(({ data, error }) => {
        if (error) {
            console.error('❌ ERREUR SUPABASE:', error);
            callback(error);
        } else {
            console.log("✅ Code WhatsApp inséré !");
            callback(null, { id: data?.[0]?.id, code });
        }
    });
};

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
                console.error('Erreur verifyWhatsAppCode:', error);
                callback(error);
            } else if (data && data.length > 0) {
                const row = data[0];
                supabase.from('whatsapp_validation')
                    .update({ statut: 'valide', date_validation: new Date().toISOString() })
                    .eq('id_validation', row.id_validation)
                    .then(() => {
                        callback(null, row);
                    });
            } else {
                callback(null, null);
            }
        });
};

db.logAction = (userId, userType, action, ip, callback) => {
    supabase.from('logs_connexion').insert({
        id_utilisateur: userId,
        type_utilisateur: userType,
        action: action,
        ip: ip
    }).then(({ error }) => {
        if (error) {
            console.error('Erreur logAction:', error);
            callback(error);
        } else {
            callback(null);
        }
    });
};

// ==========================================
// 3. FONCTIONS UTILITAIRES
// ==========================================

function extractTableName(sql) {
    const match = sql.match(/(?:FROM|INTO|UPDATE|DELETE\s+FROM)\s+([a-zA-Z0-9_]+)/i);
    return match ? match[1] : 'personnel';
}

function extractWhereConditions(sql) {
    const match = sql.match(/WHERE\s+(.+?)(?:\s+ORDER BY|\s+GROUP BY|\s+LIMIT|$)/i);
    if (!match) return [];
    return match[1].split(/AND/i).map(c => {
        const [column, value] = c.split('=').map(s => s.trim().replace(/['"]/g, ''));
        return { column, value };
    }).filter(c => c.column);
}

function extractInsertKeys(sql) {
    const match = sql.match(/\((.*?)\)/);
    if (!match) return [];
    return match[1].split(',').map(c => c.trim());
}

function extractUpdateData(sql) {
    const match = sql.match(/SET\s+(.+?)(?:\s+WHERE|$)/i);
    if (!match) return {};
    const data = {};
    match[1].split(',').forEach(p => {
        const [k, v] = p.split('=').map(s => s.trim().replace(/['"]/g, ''));
        data[k] = v;
    });
    return data;
}

module.exports = db;
