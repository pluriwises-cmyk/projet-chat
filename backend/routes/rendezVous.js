const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
    const query = `
        SELECT r.*, b.nom, b.prenom 
        FROM rendez_vous r
        LEFT JOIN beneficiaire b ON r.id_beneficiaire = b.id_beneficiaire
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
// POST ajouter un rendez-vous
router.post('/', (req, res) => {
    const { id_beneficiaire, id_medecin, date_rdv, motif } = req.body;
    if (!id_beneficiaire || !id_medecin || !date_rdv) {
        return res.status(400).json({ error: "Tous les champs sont requis" });
    }
    db.run(
        `INSERT INTO rendez_vous (id_beneficiaire, id_medecin, date_rdv, motif, statut)
         VALUES (?, ?, ?, ?, 'planifie')`,
        [id_beneficiaire, id_medecin, date_rdv, motif],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID, message: "Rendez-vous ajouté" });
            }
        }
    );
});

// POST ajouter un rendez-vous
router.post('/', (req, res) => {
    const { id_beneficiaire, id_medecin, date_rdv, motif } = req.body;
    if (!id_beneficiaire || !id_medecin || !date_rdv) {
        return res.status(400).json({ error: "Tous les champs sont requis" });
    }
    db.run(
        `INSERT INTO rendez_vous (id_beneficiaire, id_medecin, date_rdv, motif, statut)
         VALUES (?, ?, ?, ?, 'planifie')`,
        [id_beneficiaire, id_medecin, date_rdv, motif],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID, message: "Rendez-vous ajouté" });
            }
        }
    );
});
// GET rendez-vous d’un patient spécifique
router.get('/patient/:id', (req, res) => {
    const id = req.params.id;
    const query = `
        SELECT r.*, b.nom, b.prenom 
        FROM rendez_vous r
        LEFT JOIN beneficiaire b ON r.id_beneficiaire = b.id_beneficiaire
        WHERE r.id_beneficiaire = ?
    `;
    db.all(query, [id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
// GET /api/rendez-vous/medecin/:id
router.get('/medecin/:id', (req, res) => {
    const medecinId = req.params.id;
    
    const query = `
        SELECT r.*, 
               b.nom, 
               b.prenom
        FROM rendez_vous r
        LEFT JOIN beneficiaire b ON r.id_beneficiaire = b.id_beneficiaire
        WHERE r.id_medecin = ?
        ORDER BY r.date_rdv ASC
        LIMIT 10
    `;
    
    db.all(query, [medecinId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});
module.exports = router;