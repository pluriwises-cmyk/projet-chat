const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
    const query = `
        SELECT c.*, v.immatriculation, p.nom as chauffeur_nom, p.prenom as chauffeur_prenom, b.nom as patient_nom, b.prenom as patient_prenom
        FROM course c
        LEFT JOIN vehicule v ON c.id_vehicule = v.id_vehicule
        LEFT JOIN personnel p ON c.id_chauffeur = p.id_personnel
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
// POST ajouter une course
router.post('/', (req, res) => {
    const { id_vehicule, id_chauffeur, id_beneficiaire, date_depart, lieu_depart, destination, type } = req.body;
    if (!id_vehicule || !id_chauffeur || !id_beneficiaire || !date_depart || !lieu_depart || !destination) {
        return res.status(400).json({ error: "Tous les champs sauf type sont requis" });
    }
    db.run(
        `INSERT INTO course (id_vehicule, id_chauffeur, id_beneficiaire, date_depart, lieu_depart, destination, type, statut)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'planifiee')`,
        [id_vehicule, id_chauffeur, id_beneficiaire, date_depart, lieu_depart, destination, type || 'sanitaire'],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID, message: "Course planifiée" });
            }
        }
    );
});
// GET /api/courses/chauffeur/:id
router.get('/chauffeur/:id', (req, res) => {
    const chauffeurId = req.params.id;
    
    const query = `
        SELECT c.*, v.immatriculation, b.nom as patient_nom, b.prenom as patient_prenom
        FROM course c
        LEFT JOIN vehicule v ON c.id_vehicule = v.id_vehicule
        LEFT JOIN beneficiaire b ON c.id_beneficiaire = b.id_beneficiaire
        WHERE c.id_chauffeur = ?
        ORDER BY c.date_depart ASC
    `;
    
    db.all(query, [chauffeurId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

module.exports = router;