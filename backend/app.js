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

// Dossier statique
app.use(express.static(path.join(__dirname, '../frontend')));

// ===== INITIALISATION =====
const initDatabase = () => {
    console.log('🔄 Initialisation de la base...');
    db.run(`ALTER TABLE personnel ADD COLUMN mot_de_passe TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Erreur ALTER TABLE:', err.message);
        } else {
            console.log('✅ Vérification/Ajout colonne mot_de_passe terminée.');
        }
    });
};

setTimeout(initDatabase, 2000);

// ============================================
// ROUTES API
// ============================================

// Routes principales
app.use('/api/auth', authRoutes);
app.use('/api/beneficiaires', require('./routes/beneficiaires'));
app.use('/api/consultations', require('./routes/consultations'));
app.use('/api/statistiques', require('./routes/statistiques'));

// Routes médecin
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/rendez-vous', require('./routes/rendezVous'));

// Routes infirmier
app.use('/api/constantes', require('./routes/constantes'));   // ✅ Pluriel
app.use('/api/constante', require('./routes/constantes'));    // ✅ Alias singulier pour le front
app.use('/api/soins', require('./routes/soins'));
app.use('/api/medicaments', require('./routes/medicaments'));
app.use('/api/planning', require('./routes/planning'));

// Routes hôtellerie
app.use('/api/chambres', require('./routes/chambres'));
app.use('/api/commandes', require('./routes/commandes'));

// Routes logistique
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/produits', require('./routes/produits'));

// Routes voyages
app.use('/api/vehicules', require('./routes/vehicules'));
app.use('/api/courses', require('./routes/courses'));

// Routes qualité
app.use('/api/indicateurs-qualite', require('./routes/indicateursQualite'));

// Routes direction
app.use('/api/factures', require('./routes/factures'));
app.use('/api/admissions', require('./routes/admissions'));
app.use('/api/dossiers-medicaux', require('./routes/dossiersMedicaux'));
app.use('/api/rapports', require('./routes/rapports'));

// Routes paramètres
app.use('/api/personnel', require('./routes/personnel'));
app.use('/api/parametres', require('./routes/parametres'));
app.use('/api/projets', require('./routes/projets'));

// Routes WhatsApp
app.use('/api/whatsapp', require('./routes/whatsapp'));

// Routes spécialistes
app.use('/api/specialistes', require('./routes/specialistes'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/documents', require('./routes/documents'));

// Routes stats (alias)
app.use('/api/stats', require('./routes/stats'));

// ===== STATISTIQUES MÉDECIN (Route directe) =====
app.get('/api/stats/medecin/:id', (req, res) => {
    const id = req.params.id;
    const today = new Date().toISOString().split('T')[0];

    db.get(`SELECT COUNT(*) as count FROM consultation WHERE id_medecin = ? AND date_heure LIKE ?`, [id, `${today}%`], (err, cons) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get(`SELECT COUNT(DISTINCT id_beneficiaire) as count FROM consultation WHERE id_medecin = ?`, [id], (err, pat) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.get(`SELECT COUNT(*) as count FROM rendez_vous WHERE id_medecin = ? AND date_rdv LIKE ?`, [id, `${today}%`], (err, rdvJ) => {
                if (err) return res.status(500).json({ error: err.message });
                
                db.get(`SELECT COUNT(*) as count FROM rendez_vous WHERE id_medecin = ? AND statut = 'en_attente'`, [id], (err, rdvA) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    res.json({
                        consultations_jour: cons ? cons.count : 0,
                        patients_total: pat ? pat.count : 0,
                        rdv_jour: rdvJ ? rdvJ.count : 0,
                        rdv_attente: rdvA ? rdvA.count : 0
                    });
                });
            });
        });
    });
});

// ============================================
// ROUTE 404 - Non trouvée
// ============================================
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur actif sur http://localhost:${PORT}`);
});
