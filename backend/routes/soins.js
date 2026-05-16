const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
    const query = `
        SELECT s.*, b.nom, b.prenom 
        FROM soins s
        LEFT JOIN beneficiaire b ON s.id_beneficiaire = b.id_beneficiaire
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
// POST ajouter un soin
router.post('/', (req, res) => {
    const { id_beneficiaire, type_soin, urgent } = req.body;
    if (!id_beneficiaire || !type_soin) {
        return res.status(400).json({ error: "Patient et type de soin requis" });
    }
    db.run(
        `INSERT INTO soins (id_beneficiaire, type_soin, urgent, statut, date_soin)
         VALUES (?, ?, ?, 'programme', datetime('now'))`,
        [id_beneficiaire, type_soin, urgent || 0],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID, message: "Soin programmé" });
            }
        }
    );
});

module.exports = router;