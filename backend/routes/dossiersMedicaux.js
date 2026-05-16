const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET tous les dossiers
router.get('/', (req, res) => {
    const query = `
        SELECT d.*, b.nom, b.prenom 
        FROM dossier_medical d
        LEFT JOIN beneficiaire b ON d.id_beneficiaire = b.id_beneficiaire
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// GET dossier d'un patient spécifique (AJOUTE CETTE ROUTE)
router.get('/patient/:id', (req, res) => {
    const patientId = req.params.id;
    
    const query = `
        SELECT d.* 
        FROM dossier_medical d
        WHERE d.id_beneficiaire = ?
    `;
    
    db.get(query, [patientId], (err, row) => {
        if (err) {
            console.error('Erreur DB:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (!row) {
            // Aucun dossier trouvé - retourner des valeurs par défaut
            return res.json({
                groupe_sanguin: "Non renseigné",
                allergies: "Aucune",
                antecedents: "Aucun",
                traitements_en_cours: "Aucun",
                medecin_traitant: "Non renseigné"
            });
        }
        
        res.json({
            groupe_sanguin: row.groupe_sanguin || "Non renseigné",
            allergies: row.allergies || "Aucune",
            antecedents: row.antecedents || "Aucun",
            traitements_en_cours: row.traitements_en_cours || "Aucun",
            medecin_traitant: row.medecin_traitant || "Non renseigné"
        });
    });
});

module.exports = router;