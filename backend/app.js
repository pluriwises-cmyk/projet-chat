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
