// backend/database/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'hospitalier.db');

// Connexion à la base
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erreur de connexion à la base:', err.message);
    } else {
        console.log('✅ Connecté à la base SQLite');
    }
});

// ============================================
// FONCTIONS WHATSAPP
// ============================================

// Générer et sauvegarder un code WhatsApp
db.saveWhatsAppCode = (telephone, callback) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 2);

    db.run(
        `INSERT INTO whatsapp_validation (telephone, code, date_expiration, statut) 
         VALUES (?, ?, ?, 'en_attente')`,
        [telephone, code, expiration.toISOString()],
        function (err) {
            if (err) {
                console.error('Erreur sauvegarde code:', err);
                callback(err);
            } else {
                callback(null, { id: this.lastID, code });
            }
        }
    );
};

// Vérifier un code WhatsApp
db.verifyWhatsAppCode = (telephone, code, callback) => {
    db.get(
        `SELECT w.*, b.id_beneficiaire, b.nom, b.prenom 
         FROM whatsapp_validation w
         LEFT JOIN beneficiaire b ON w.telephone = b.telephone OR w.telephone = b.whatsapp
         WHERE w.telephone = ? AND w.code = ? AND w.statut = 'en_attente'
         AND w.date_expiration > datetime('now')
         ORDER BY w.date_envoi DESC LIMIT 1`,
        [telephone, code],
        (err, row) => {
            if (err) {
                callback(err);
            } else if (row) {
                // Marquer comme validé
                db.run(
                    `UPDATE whatsapp_validation SET statut = 'valide', date_validation = datetime('now') 
                     WHERE id_validation = ?`,
                    [row.id_validation]
                );
                callback(null, row);
            } else {
                callback(null, null);
            }
        }
    );
};

// Logger une action
db.logAction = (userId, userType, action, ip, callback) => {
    db.run(
        `INSERT INTO logs_connexion (id_utilisateur, type_utilisateur, action, ip) 
         VALUES (?, ?, ?, ?)`,
        [userId, userType, action, ip],
        callback
    );
};

module.exports = db;