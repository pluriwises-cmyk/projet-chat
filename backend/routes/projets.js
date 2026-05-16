const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
    db.all('SELECT * FROM projets', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
// POST ajouter un projet
router.post('/', (req, res) => {
    const { nom, description, budget, avancement, statut } = req.body;
    if (!nom) {
        return res.status(400).json({ error: "Nom du projet requis" });
    }
    db.run(
        `INSERT INTO projets (nom, description, budget, avancement, statut)
         VALUES (?, ?, ?, ?, ?)`,
        [nom, description, budget || 0, avancement || 0, statut || 'planifie'],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID, message: "Projet ajouté" });
            }
        }
    );
});

module.exports = router;