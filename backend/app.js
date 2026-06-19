// backend/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const authRoutes = require('./routes/auth');

// ============================================
// CONFIGURATION SUPABASE
// ============================================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);
console.log('✅ Connexion Supabase établie');

// ============================================
// MIDDLEWARES
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dossier statique
app.use(express.static(path.join(__dirname, '../frontend')));

// ===== INITIALISATION =====
console.log('✅ Base de données prête');

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
app.use('/api/constantes', require('./routes/constantes'));
app.use('/api/constante', require('./routes/constantes'));
app.use('/api/soins', require('./routes/soins'));
app.use('/api/medicaments', require('./routes/medicaments'));
app.use('/api/planning', require('./routes/planning'));

// Routes administratif
app.use('/api/admissions', require('./routes/admissions'));
app.use('/api/factures', require('./routes/factures'));
app.use('/api/dossiers-medicaux', require('./routes/dossiersMedicaux'));
app.use('/api/personnel', require('./routes/personnel'));

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
app.use('/api/rapports', require('./routes/rapports'));

// Routes paramètres
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

// ============================================
// STATISTIQUES MÉDECIN (Version Supabase)
// ============================================
app.get('/api/stats/medecin/:id', async (req, res) => {
    const id = req.params.id;
    const today = new Date().toISOString().split('T')[0];

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID médecin invalide" });
    }

    try {
        // Exécution en parallèle
        const [consultationsJour, patientsTotal, rdvJour, rdvAttente] = await Promise.all([
            // Consultations du jour
            supabase
                .from('consultation')
                .select('*', { count: 'exact', head: true })
                .eq('id_medecin', id)
                .gte('date_heure', today),

            // Patients distincts
            supabase
                .from('consultation')
                .select('id_beneficiaire', { count: 'exact', head: true })
                .eq('id_medecin', id),

            // Rendez-vous du jour
            supabase
                .from('rendez_vous')
                .select('*', { count: 'exact', head: true })
                .eq('id_medecin', id)
                .gte('date_rdv', today),

            // Rendez-vous en attente
            supabase
                .from('rendez_vous')
                .select('*', { count: 'exact', head: true })
                .eq('id_medecin', id)
                .eq('statut', 'en_attente')
        ]);

        res.json({
            consultations_jour: consultationsJour.count || 0,
            patients_total: patientsTotal.count || 0,
            rdv_jour: rdvJour.count || 0,
            rdv_attente: rdvAttente.count || 0
        });

    } catch (err) {
        console.error('❌ Erreur stats médecin:', err);
        res.status(500).json({ error: err.message });
    }
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
