const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/messages/patient/:id
router.get('/patient/:id', (req, res) => {
    const patientId = req.params.id;
    
    const query = `
        SELECT m.*, 
               p.nom as medecin_nom, 
               p.prenom as medecin_prenom
        FROM messages m
        LEFT JOIN personnel p ON m.id_medecin = p.id_personnel
        WHERE m.id_beneficiaire = ?
        ORDER BY m.date_envoi DESC
    `;
    
    db.all(query, [patientId], (err, rows) => {
        if (err) {
            console.error('Erreur DB:', err);
            return res.status(500).json({ error: err.message });
        }
        
        res.json(rows || []);
    });
});

// POST /api/messages (envoyer un message)
router.post('/', (req, res) => {
    const { id_beneficiaire, id_medecin, sujet, contenu } = req.body;
    
    if (!id_beneficiaire || !sujet || !contenu) {
        return res.status(400).json({ error: 'Destinataire, sujet et contenu requis' });
    }
    
    const query = `
        INSERT INTO messages (id_beneficiaire, id_medecin, sujet, contenu, date_envoi, statut)
        VALUES (?, ?, ?, ?, datetime('now'), 'non_lu')
    `;
    
    db.run(query, [id_beneficiaire, id_medecin || null, sujet, contenu], function(err) {
        if (err) {
            console.error('Erreur insertion:', err);
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            success: true,
            id: this.lastID,
            message: 'Message envoyé'
        });
    });
});

// PUT /api/messages/:id/lire (marquer comme lu)
router.put('/:id/lire', (req, res) => {
    const messageId = req.params.id;
    
    db.run('UPDATE messages SET statut = ? WHERE id_message = ?', ['lu', messageId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

module.exports = router;