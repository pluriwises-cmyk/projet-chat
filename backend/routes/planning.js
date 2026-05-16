const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
    const query = `
        SELECT p.*, pe.nom, pe.prenom 
        FROM planning p
        LEFT JOIN personnel pe ON p.id_personnel = pe.id_personnel
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

module.exports = router;