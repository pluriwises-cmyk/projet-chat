const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
    const query = `
        SELECT f.*, b.nom, b.prenom 
        FROM facture f
        LEFT JOIN beneficiaire b ON f.id_beneficiaire = b.id_beneficiaire
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
// GET factures d’un patient spécifique
router.get('/patient/:id', (req, res) => {
    const id = req.params.id;
    const query = `
        SELECT f.*, b.nom, b.prenom 
        FROM facture f
        LEFT JOIN beneficiaire b ON f.id_beneficiaire = b.id_beneficiaire
        WHERE f.id_beneficiaire = ?
        ORDER BY f.date_emission DESC
    `;
    db.all(query, [id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

module.exports = router;