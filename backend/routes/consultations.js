const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET toutes les consultations
router.get('/', (req, res) => {
    const query = `
        SELECT c.*, b.nom as patientNom, b.prenom as patientPrenom 
        FROM consultation c
        LEFT JOIN beneficiaire b ON c.id_beneficiaire = b.id_beneficiaire
        ORDER BY c.date_heure DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET une consultation par ID
router.get('/details/:id', (req, res) => {
    const query = `
        SELECT c.*, b.nom, b.prenom 
        FROM consultation c
        LEFT JOIN beneficiaire b ON c.id_beneficiaire = b.id_beneficiaire
        WHERE c.id_consultation = ?
    `;
    db.get(query, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Consultation non trouvée" });
        res.json(row);
    });
});

// GET consultations par médecin (CORRIGÉ)
router.get('/medecin/:id', (req, res) => {
    const query = `
        SELECT c.*, b.nom as patient_nom, b.prenom as patient_prenom
        FROM consultation c
        LEFT JOIN beneficiaire b ON c.id_beneficiaire = b.id_beneficiaire
        WHERE c.id_medecin = ?
        ORDER BY c.date_heure DESC
        LIMIT 10
    `;
    db.all(query, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// POST ajouter une consultation (UNIQUE)
router.post('/', (req, res) => {
    const { id_beneficiaire, id_medecin, date_heure, type, motif, statut } = req.body;
    
    if (!id_beneficiaire || !id_medecin || !date_heure) {
        return res.status(400).json({ error: 'Patient, médecin et date requis' });
    }
    
    const query = `
        INSERT INTO consultation (id_beneficiaire, id_medecin, date_heure, type, motif, statut)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [id_beneficiaire, id_medecin, date_heure, type || 'presentiel', motif || '', statut || 'planifiee'], function(err) {
        if (err) {
            console.error('Erreur SQL:', err);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ success: true, id: this.lastID });
    });
});

module.exports = router;
