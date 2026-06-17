
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
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ Colonne mot_de_passe existe déjà');
            } else {
                console.log('⚠️ Erreur lors de l\'ajout de la colonne:', err.message);
            }
        } else {
            console.log('✅ Colonne mot_de_passe ajoutée avec succès');
        }
        
        // 2. Injection des comptes personnel (démo)
        const users = [
            ['Dellal', 'Jamal', 'medecin', 'jean.dupont@chat.com', '0612345601', 'password123', 'actif'],
            ['Diallo', 'Imad', 'medecin', 'dr.diallo@chat.com', '771234444', 'password123', 'actif'],
            ['Benammar', 'Khaled', 'infirmier', 'khaled.benammar@chat.com', '0612345610', 'password123', 'actif'],
            ['Zahra', 'Fatima', 'infirmier', 'fatima.zahra@chat.com', '0612345611', 'password123', 'actif'],
            ['Admin', 'Principal', 'administratif', 'admin@chat.com', '0612345620', 'admin123', 'actif'],
            ['Touré', 'Ali', 'hotellerie', 'ali.toure@chat.com', '0612345630', 'password123', 'actif'],
            ['Dali', 'Moussa', 'logistique', 'moussa.diop@chat.com', '0612345640', 'password123', 'actif'],
            ['Diafi', 'Aïcha', 'qualite', 'aicha.diallo@chat.com', '0612345650', 'password123', 'actif'],
            ['Sowane', 'Ousmane', 'voyages', 'ousmane.sow@chat.com', '0612345660', 'password123', 'actif'],
            ['Ndiaye', 'Pape', 'chauffeur', 'pape.ndiaye@chat.com', '771234569', 'password123', 'actif'],
            ['Fall', 'Aminata', 'direction', 'aminata.fall@chat.com', '771234570', 'password123', 'actif'],
            ['Boumesjed', 'Mohamed', 'boss', 'mohamed.boumesjed@chat.com', '771234571', 'password123', 'actif']
        ];

        let completed = 0;
        users.forEach(user => {
            const sql = `INSERT OR IGNORE INTO personnel (nom, prenom, poste, email, telephone, mot_de_passe, statut) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)`;
            db.run(sql, user, (err) => {
                if (err) {
                    console.error(`❌ Erreur insertion ${user[1]} ${user[0]}:`, err.message);
                }
                completed++;
                if (completed === users.length) {
                    console.log('✅ Comptes personnel injectés (12 profils)');
                }
            });
        });

        // 3. Injection des données de test (bénéficiaires, chambres, etc.)
        setTimeout(() => {
            console.log('🔄 Injection des données de test...');

            const testData = [
                // Bénéficiaires
                `INSERT OR IGNORE INTO beneficiaire (nom, prenom, type, telephone, email, statut) VALUES
                 ('Derbel', 'Hamidou', 'patient', '771234567', 'hamidou.derbel@chat.com', 'actif'),
                 ('Fillali', 'Amina', 'touriste', '781234567', 'amina.fillali@chat.com', 'actif'),
                 ('Sowali', 'Oumar', 'mixte', '761234567', 'oumar.sowali@chat.com', 'actif'),
                 ('Benchaa', 'Mustapha', 'patient', '55555555', 'mustapha.benchaa@chat.com', 'actif'),
                 ('Sarnou', 'Yacine', 'patient', '666666666', 'yacine.sarnou@chat.com', 'actif'),
                 ('Mansour', 'Houari', 'patient', '3399902100', 'houari.mansour@chat.com', 'actif'),
                 ('Boudouma', 'Saleh', 'patient', '60606060', 'saleh.boudouma@chat.com', 'actif')`,

                // Chambres
                `INSERT OR IGNORE INTO chambre (numero, type, capacite, statut) VALUES
                 ('101', 'standard', 2, 'libre'),
                 ('102', 'standard', 2, 'libre'),
                 ('201', 'medicalisee', 1, 'libre'),
                 ('202', 'medicalisee', 1, 'libre'),
                 ('301', 'suite', 2, 'libre'),
                 ('103', 'medicalisee', 1, 'occupee'),
                 ('104', 'standard', 1, 'libre'),
                 ('110', 'standard', 2, 'libre')`,

                // Véhicules
                `INSERT OR IGNORE INTO vehicule (immatriculation, type, etat) VALUES
                 ('AMB-001', 'ambulance', 'disponible'),
                 ('MB-002', 'minibus', 'disponible'),
                 ('AB-123-CD', 'ambulance', 'disponible'),
                 ('EF-456-GH', 'ambulance', 'en_course'),
                 ('IJ-789-KL', 'voiture', 'disponible'),
                 ('MN-012-OP', 'minibus', 'maintenance')`,

                // Services
                `INSERT OR IGNORE INTO service (nom, departement, description) VALUES
                 ('Hospitalisation', 'medical', 'Service d''hospitalisation'),
                 ('Consultations', 'medical', 'Consultations généralistes et spécialisées'),
                 ('Rééducation', 'medical', 'Service de rééducation fonctionnelle'),
                 ('Apithérapie', 'medical', 'Traitements à base de miel'),
                 ('Réception Hôtel', 'hotellerie', 'Accueil des touristes'),
                 ('Étages', 'hotellerie', 'Gestion des étages et chambres'),
                 ('Restauration', 'hotellerie', 'Restauration collective'),
                 ('Agence Voyages', 'hotellerie', 'Organisation des courses'),
                 ('RH', 'gestion', 'Ressources humaines'),
                 ('Comptabilité', 'gestion', 'Gestion financière'),
                 ('Moyens Généraux', 'gestion', 'Maintenance, logistique'),
                 ('Informatique', 'gestion', 'Systèmes d’information'),
                 ('Direction', 'direction', 'Direction générale')`,

                // Paramètres
                `INSERT OR IGNORE INTO parametre (cle, valeur, description) VALUES
                 ('nom_etablissement', 'Clinique Hôtelière et Actions Touristiques (CHAT)', 'Nom officiel'),
                 ('adresse', 'UDL SBA, ALGERIE', 'Adresse complète'),
                 ('telephone', '+213 773 460 284', 'Téléphone standard'),
                 ('langue', 'Arabe,Anglais,Français', 'Langues disponibles'),
                 ('fuseau_horaire', 'GMT+1', 'Fuseau horaire')`
            ];

            testData.forEach(sql => {
                db.run(sql, (err) => {
                    if (err) console.error('❌ Erreur injection test:', err.message);
                });
            });

            console.log('✅ Données de test injectées (bénéficiaires, chambres, véhicules, services, paramètres)');
        }, 1000);
    });
};

// Exécuter l'initialisation APRÈS la connexion à la base
setTimeout(() => {
    initDatabase();
}, 2000);
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
app.get('/api/test-consultations/:id', (req, res) => {
    const id = req.params.id;
    db.all(`SELECT * FROM consultation WHERE id_medecin = ?`, [id], (err, rows) => {
        if (err) {
            res.json({ error: err.message });
        } else {
            res.json({ consultations: rows });
        }
    });
});
// ==================== ROUTE CONSULTATIONS MÉDECIN ====================
app.get('/api/consultations/medecin/:id', (req, res) => {
    const id = req.params.id;
    db.all(`SELECT * FROM consultation WHERE id_medecin = ?`, [id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
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
