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

module.exports = router;