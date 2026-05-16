const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
    const query = `
        SELECT a.*, b.nom, b.prenom 
        FROM admissions a
        LEFT JOIN beneficiaire b ON a.id_beneficiaire = b.id_beneficiaire
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
// POST ajouter une admission
router.post('/', (req, res) => {
    const { id_beneficiaire, service, medecin, statut } = req.body;
    if (!id_beneficiaire || !service) {
        return res.status(400).json({ error: "Patient et service requis" });
    }
    db.run(
        `INSERT INTO admissions (id_beneficiaire, service, medecin, statut, date_admission)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [id_beneficiaire, service, medecin, statut || 'en_attente'],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID, message: "Admission enregistrée" });
            }
        }
    );
});

module.exports = router;