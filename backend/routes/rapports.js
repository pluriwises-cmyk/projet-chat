const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
    db.all('SELECT * FROM rapport', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
// POST ajouter un rapport
router.post('/', (req, res) => {
    const { nom, periode, taille, url } = req.body;
    if (!nom || !periode || !taille || !url) {
        return res.status(400).json({ error: "Tous les champs sont requis" });
    }
    db.run(
        `INSERT INTO rapport (nom, periode, taille, url)
         VALUES (?, ?, ?, ?)`,
        [nom, periode, taille, url],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID, message: "Rapport ajouté" });
            }
        }
    );
});

module.exports = router;