const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET toutes les constantes avec noms des patients
router.get('/', (req, res) => {
    const query = `
        SELECT c.*, b.nom, b.prenom 
        FROM constantes c
        LEFT JOIN beneficiaire b ON c.id_beneficiaire = b.id_beneficiaire
        ORDER BY c.date_prise DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// POST ajouter une constante
router.post('/', (req, res) => {
    const { id_beneficiaire, tension, pouls, temperature, saturation } = req.body;
    if (!id_beneficiaire) {
        return res.status(400).json({ error: "Patient requis" });
    }
    db.run(
        `INSERT INTO constantes (id_beneficiaire, tension, pouls, temperature, saturation, date_prise)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [id_beneficiaire, tension, pouls, temperature, saturation],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID, message: "Constante enregistrée" });
            }
        }
    );
});

module.exports = router;