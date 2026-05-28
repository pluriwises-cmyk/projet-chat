const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
    const query = `
        SELECT s.*, p.nom, p.prenom, p.telephone, p.email 
        FROM specialiste s
        LEFT JOIN personnel p ON s.id_personnel = p.id_personnel
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
router.get('/api/specialistes', (req, res) => {
    const query = `
        SELECT s.id_specialiste, s.id_personnel, p.nom, p.prenom, 
               s.specialite, s.photo_url, p.telephone, p.email, 
               s.description, s.cv_url
        FROM specialiste s
        LEFT JOIN personnel p ON s.id_personnel = p.id_personnel
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
// ROUTE CORRECTE : utiliser router au lieu de app
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM specialistes ORDER BY nom';
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Erreur chargement spécialistes:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        res.json(results);
    });
});
module.exports = router;
