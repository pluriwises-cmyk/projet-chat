const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET toutes les prescriptions avec noms des patients
router.get('/', (req, res) => {
    const query = `
        SELECT p.*, b.nom, b.prenom 
        FROM prescription p
        LEFT JOIN beneficiaire b ON p.id_beneficiaire = b.id_beneficiaire
        ORDER BY p.date_prescription DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erreur SQL:', err.message);
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// POST ajouter une prescription
router.post('/', (req, res) => {
    const { id_beneficiaire, medicament, posologie, statut } = req.body;
    if (!id_beneficiaire || !medicament) {
        return res.status(400).json({ error: "Patient et médicament requis" });
    }
    db.run(
        `INSERT INTO prescription (id_beneficiaire, medicament, posologie, statut, date_prescription)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [id_beneficiaire, medicament, posologie, statut || 'en_cours'],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID, message: "Prescription ajoutée" });
            }
        }
    );
});
// GET prescriptions d’un patient spécifique
router.get('/patient/:id', (req, res) => {
    const id = req.params.id;
    const query = `
        SELECT p.*, b.nom, b.prenom 
        FROM prescription p
        LEFT JOIN beneficiaire b ON p.id_beneficiaire = b.id_beneficiaire
        WHERE p.id_beneficiaire = ?
        ORDER BY p.date_prescription DESC
    `;
    db.all(query, [id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
// POST /api/prescriptions
router.post('/', (req, res) => {
    const { id_beneficiaire, id_medecin, medicament, posologie } = req.body;
    
    if (!id_beneficiaire || !medicament) {
        return res.status(400).json({ error: 'Patient et médicament requis' });
    }
    
    const query = `
        INSERT INTO prescription (id_beneficiaire, id_medecin, medicament, posologie, date_prescription, statut)
        VALUES (?, ?, ?, ?, datetime('now'), 'en_cours')
    `;
    
    db.run(query, [id_beneficiaire, id_medecin || null, medicament, posologie], function(err) {
        if (err) {
            console.error('Erreur:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, id: this.lastID });
    });
});

module.exports = router;