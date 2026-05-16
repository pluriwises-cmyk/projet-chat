const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
    db.all('SELECT * FROM chambre', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
// POST ajouter une chambre
router.post('/', (req, res) => {
    const { numero, type, capacite, statut } = req.body;
    if (!numero) {
        return res.status(400).json({ error: "Numéro de chambre requis" });
    }
    db.run(
        `INSERT INTO chambre (numero, type, capacite, statut)
         VALUES (?, ?, ?, ?)`,
        [numero, type || 'standard', capacite || 1, statut || 'libre'],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID, message: "Chambre ajoutée" });
            }
        }
    );
});

module.exports = router;