const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
    const query = `
        SELECT m.*, b.nom, b.prenom 
        FROM medicaments m
        LEFT JOIN beneficiaire b ON m.id_beneficiaire = b.id_beneficiaire
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
router.post('/', (req, res) => {
    const { id_beneficiaire, medicament, posologie, horaire } = req.body;
    if (!id_beneficiaire || !medicament) {
        return res.status(400).json({ error: "Patient et médicament requis" });
    }
    db.run(
        `INSERT INTO medicaments (id_beneficiaire, medicament, posologie, horaire, statut)
         VALUES (?, ?, ?, ?, 'a_donner')`,
        [id_beneficiaire, medicament, posologie, horaire],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID, message: "Médicament ajouté" });
            }
        }
    );
});

module.exports = router;