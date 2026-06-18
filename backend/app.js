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
    // Ajout colonne si absente
    db.run(`ALTER TABLE personnel ADD COLUMN mot_de_passe TEXT`, (err) => {
        console.log('✅ Vérification/Ajout colonne mot_de_passe terminée.');
    });
};

setTimeout(initDatabase, 2000);

// ===== ROUTES API =====
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

// ===== STATISTIQUES MÉDECIN (CORRIGÉES) =====
app.get('/api/stats/medecin/:id', (req, res) => {
    const id = req.params.id;
    const today = new Date().toISOString().split('T')[0]; // Date YYYY-MM-DD

    // Utilisation de LIKE pour filtrer par date sans dépendre de fonctions SQL natives
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur actif sur http://localhost:${PORT}`);
});
