const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/documents/patient/:id
router.get('/patient/:id', (req, res) => {
    const patientId = req.params.id;
    
    const query = `
        SELECT * FROM documents 
        WHERE id_beneficiaire = ?
        ORDER BY date_upload DESC
    `;
    
    db.all(query, [patientId], (err, rows) => {
        if (err) {
            console.error('Erreur DB:', err);
            return res.status(500).json({ error: err.message });
        }
        
        // Si aucun document, retourner un tableau vide
        res.json(rows || []);
    });
});

// POST /api/documents (upload - à implémenter plus tard)
router.post('/', (req, res) => {
    res.json({ message: 'Upload à venir' });
});

module.exports = router;