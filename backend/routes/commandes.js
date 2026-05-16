const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
    const query = `
        SELECT c.*, b.nom, b.prenom 
        FROM commande_restauration c
        LEFT JOIN beneficiaire b ON c.id_beneficiaire = b.id_beneficiaire
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
// POST ajouter une commande repas
router.post('/', (req, res) => {
    const { id_beneficiaire, type_service, regime, instructions } = req.body;
    if (!id_beneficiaire || !type_service) {
        return res.status(400).json({ error: "Patient et type de service requis" });
    }
    db.run(
        `INSERT INTO commande_restauration (id_beneficiaire, type_service, regime, instructions, statut)
         VALUES (?, ?, ?, ?, 'en_cuisine')`,
        [id_beneficiaire, type_service, regime, instructions],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID, message: "Commande enregistrée" });
            }
        }
    );
});

module.exports = router;