// backend/app.js
// backend/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;
const authRoutes = require('./routes/auth');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dossier statique (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));
console.log('📁 Dossier frontend servi:', path.join(__dirname, '../frontend'));

// ===== INITIALISATION AUTOMATIQUE DE LA BASE =====
const initDatabase = () => {
    console.log('🔄 Initialisation de la base...');
    
    // 1. Ajouter la colonne mot_de_passe si elle n'existe pas
    db.run(`ALTER TABLE personnel ADD COLUMN mot_de_passe TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.log('ℹ️ Erreur (ignoree):', err.message);
        } else {
            console.log('✅ Colonne mot_de_passe vérifiée/ajoutée');
        }
    });

    // 2. Liste des utilisateurs par défaut
    const users = [
        ['Dellal', 'Jamal', 'medecin', 'jean.dupont@chat.com', '0612345601', 'password123', 'actif'],
        ['Mansouri', 'Soumia', 'medecin', 'sophie.martin@chat.com', '0612345602', 'password123', 'actif'],
        ['Benammar', 'Khaled', 'infirmier', 'khaled.benammar@chat.com', '0612345610', 'password123', 'actif'],
        ['Zahra', 'Fatima', 'infirmier', 'fatima.zahra@chat.com', '0612345611', 'password123', 'actif'],
        ['Admin', 'Principal', 'administratif', 'admin@chat.com', '0612345620', 'admin123', 'actif'],
        ['Touril', 'Ali', 'hotellerie', 'ali.toure@chat.com', '0612345630', 'password123', 'actif'],
        ['Dilawi', 'Moussa', 'logistique', 'moussa.diop@chat.com', '0612345640', 'password123', 'actif'],
        ['Diallo', 'Aïcha', 'qualite', 'aicha.diallo@chat.com', '0612345650', 'password123', 'actif'],
        ['Sowwane', 'Ousmane', 'voyages', 'ousmane.sow@chat.com', '0612345660', 'password123', 'actif']
    ];

    // 3. Insérer ou ignorer les utilisateurs
    users.forEach(user => {
        const sql = `INSERT OR IGNORE INTO personnel (nom, prenom, poste, email, telephone, mot_de_passe, statut) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, user, (err) => {
            if (err) {
                console.error(`❌ Erreur insertion ${user[1]} ${user[0]}:`, err.message);
            }
        });
    });

    console.log('✅ Initialisation automatique des utilisateurs terminée');
};

// Exécuter l'initialisation APRÈS avoir vérifié que la base est connectée
setTimeout(() => {
    initDatabase();
}, 1000);
// ===== FIN INITIALISATION =====

// ==================== ROUTES API ====================
app.use('/api/beneficiaires', require('./routes/beneficiaires'));
app.use('/api/consultations', require('./routes/consultations'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/constantes', require('./routes/constantes'));
app.use('/api/soins', require('./routes/soins'));
app.use('/api/medicaments', require('./routes/medicaments'));
app.use('/api/planning', require('./routes/planning'));
app.use('/api/admissions', require('./routes/admissions'));
app.use('/api/factures', require('./routes/factures'));
app.use('/api/dossiers-medicaux', require('./routes/dossiersMedicaux'));
app.use('/api/rendez-vous', require('./routes/rendezVous'));
app.use('/api/produits', require('./routes/produits'));
app.use('/api/indicateurs-qualite', require('./routes/indicateursQualite'));
app.use('/api/chambres', require('./routes/chambres'));
app.use('/api/commandes', require('./routes/commandes'));
app.use('/api/vehicules', require('./routes/vehicules'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/rapports', require('./routes/rapports'));
app.use('/api/parametres', require('./routes/parametres'));
app.use('/api/personnel', require('./routes/personnel'));
app.use('/api/projets', require('./routes/projets'));
app.use('/api/statistiques', require('./routes/statistiques'));
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/specialistes', require('./routes/specialistes'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/soins', require('./routes/soins'));
app.use('/api/constantes', require('./routes/constantes'));
app.use('/api/auth', authRoutes);

// ==================== TEST ====================
app.get('/api/test', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM beneficiaire', [], (err, row) => {
        if (err) {
            res.json({ error: err.message });
        } else {
            res.json({ message: 'Base connectée', beneficiaires: row.count });
        }
    });
});

// ==================== DÉMARRAGE ====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📁 Frontend: http://localhost:${PORT}/index.html`);
    console.log(`📱 Accessible depuis le réseau à http://<VOTRE_IP>:${PORT}`);
});

// Fermeture propre de la base
process.on('SIGINT', () => {
    db.close((err) => {
        console.log('🔌 Déconnexion de la base');
        process.exit(err ? 1 : 0);
    });
});
});
