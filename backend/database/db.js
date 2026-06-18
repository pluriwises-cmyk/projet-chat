// backend/database/db.js
const { createClient } = require('@supabase/supabase-js');

// === TES IDENTIFIANTS SUPABASE ===
const supabaseUrl = 'https://mtcumvngnalsozoufltk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Y3Vtdm5nbmFsc296b3VmbHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODM4NDcsImV4cCI6MjA5NzM1OTg0N30.lBiqoKoAuDgdiYoqeQT1W6Qc_4oycLfrpRzzeFR_Ht8';

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Connecté à Supabase');

// === CRÉER L'OBJET db ===
const db = {};

// === db.get : récupère une seule ligne ===
db.get = (sql, params, callback) => {
    // Si params est une fonction, on le déplace dans callback
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }
    try {
        const tableName = extractTableName(sql);
        supabase.from(tableName).select('*').then(({ data, error }) => {
            if (error) {
                console.error('Erreur Supabase (get):', error);
                callback(error, null);
            } else {
                callback(null, data[0] || null);
            }
        }).catch(err => {
            console.error('Erreur db.get:', err);
            callback(err, null);
        });
    } catch (err) {
        console.error('Erreur db.get:', err);
        callback(err, null);
    }
};

// === db.all : récupère plusieurs lignes ===
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
        }).catch(err => {
            console.error('Erreur db.all:', err);
            callback(err, null);
        });
    } catch (err) {
        console.error('Erreur db.all:', err);
        callback(err, null);
    }
};

// === db.run : exécute une requête ===
db.run = (sql, params, callback) => {
    // Si params est une fonction, on le déplace dans callback
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }
    try {
        const tableName = extractTableName(sql);
        if (sql.trim().toLowerCase().startsWith('insert')) {
            const values = extractInsertValues(sql);
            supabase.from(tableName).insert(values).then(({ data, error }) => {
                if (error) {
                    callback(error, null);
                } else {
                    callback(null, { lastID: data?.[0]?.id || 0 });
                }
            }).catch(err => {
                callback(err, null);
            });
        } else if (sql.trim().toLowerCase().startsWith('update')) {
            // Pour l'instant, on simule un succès
            callback(null, { changes: 1 });
        } else if (sql.trim().toLowerCase().startsWith('delete')) {
            callback(null, { changes: 1 });
        } else if (sql.trim().toLowerCase().includes('alter table')) {
            // ALTER TABLE - on simule un succès
            callback(null);
        } else {
            callback(new Error('Requête non supportée'), null);
        }
    } catch (err) {
        console.error('Erreur db.run:', err);
        callback(err, null);
    }
};

// === FONCTIONS SPÉCIFIQUES WHATSAPP ===
db.saveWhatsAppCode = (telephone, callback) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 2);

    supabase.from('whatsapp_validation').insert({
        telephone: telephone,
        code: code,
        date_expiration: expiration.toISOString(),
        statut: 'en_attente'
    }).then(({ data, error }) => {
        if (error) {
            callback(error);
        } else {
            callback(null, { id: data?.[0]?.id, code });
        }
    });
};

db.verifyWhatsAppCode = (telephone, code, callback) => {
    supabase.from('whatsapp_validation')
        .select('*, beneficiaire!inner(*)')
        .eq('telephone', telephone)
        .eq('code', code)
        .eq('statut', 'en_attente')
        .gte('date_expiration', new Date().toISOString())
        .order('date_envoi', { ascending: false })
        .limit(1)
        .then(({ data, error }) => {
            if (error) {
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
            callback(error);
        } else {
            callback(null);
        }
    });
};

// === FONCTIONS UTILITAIRES ===
function extractTableName(sql) {
    const match = sql.match(/FROM\s+(\w+)/i);
    if (match) return match[1];
    const match2 = sql.match(/INTO\s+(\w+)/i);
    if (match2) return match2[1];
    return 'personnel';
}

function extractInsertValues(sql) {
    const match = sql.match(/VALUES\s*\((.+)\)/i);
    if (match) {
        const values = match[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
        const obj = {};
        values.forEach((v, i) => {
            obj[`col_${i}`] = v;
        });
        return obj;
    }
    return {};
}

module.exports = db;
