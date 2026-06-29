const express = require('express');
const router = express.Router();
const db = require('../database/db');

// ============================================
// GET Toutes les courses
// ============================================
router.get('/', (req, res) => {
    const query = `
        SELECT c.*, v.immatriculation, 
               p.nom as chauffeur_nom, p.prenom as chauffeur_prenom, 
               b.nom as patient_nom, b.prenom as patient_prenom
        FROM course c
        LEFT JOIN vehicule v ON c.id_vehicule = v.id_vehicule
        LEFT JOIN personnel p ON c.id_chauffeur = p.id_personnel
        LEFT JOIN beneficiaire b ON c.id_beneficiaire = b.id_beneficiaire
        ORDER BY c.date_depart DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('❌ Erreur GET courses:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// ============================================
// GET Courses d'un chauffeur spécifique
// ============================================
router.get('/chauffeur/:id', (req, res) => {
    const chauffeurId = req.params.id;
    
    if (!chauffeurId || isNaN(chauffeurId)) {
        return res.status(400).json({ error: "ID chauffeur invalide" });
    }
    
    const query = `
        SELECT c.*, v.immatriculation, 
               b.nom as patient_nom, b.prenom as patient_prenom
        FROM course c
        LEFT JOIN vehicule v ON c.id_vehicule = v.id_vehicule
        LEFT JOIN beneficiaire b ON c.id_beneficiaire = b.id_beneficiaire
        WHERE c.id_chauffeur = ?
        ORDER BY c.date_depart ASC
    `;
    
    db.all(query, [chauffeurId], (err, rows) => {
        if (err) {
            console.error('❌ Erreur GET courses chauffeur:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// ============================================
// POST Ajouter une course (CORRIGÉ)
// ============================================
router.post('/', (req, res) => {
    const { id_vehicule, id_chauffeur, id_beneficiaire, date_depart, lieu_depart, destination, type } = req.body;
    
    // ✅ CORRECTION : id_vehicule et id_beneficiaire sont optionnels
    if (!id_chauffeur || !date_depart || !lieu_depart || !destination) {
        return res.status(400).json({ 
            error: "Chauffeur, date, lieu départ et destination sont requis" 
        });
    }
    
    db.run(
        `INSERT INTO course (id_vehicule, id_chauffeur, id_beneficiaire, date_depart, lieu_depart, destination, type, statut)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'planifiee')`,
        [id_vehicule || null, id_chauffeur, id_beneficiaire || null, date_depart, lieu_depart, destination, type || 'sanitaire'],
        function (err) {
            if (err) {
                console.error('❌ Erreur insertion course:', err);
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ 
                id: this.lastID, 
                message: "Course planifiée avec succès" 
            });
        }
    );
});

// ============================================
// PUT Modifier une course
// ============================================
router.put('/:id', (req, res) => {
    const id = req.params.id;
    const { id_vehicule, id_chauffeur, id_beneficiaire, date_depart, lieu_depart, destination, type, statut } = req.body;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }
    
    let updates = [];
    let values = [];
    let paramIndex = 1;
    
    if (id_vehicule !== undefined) { updates.push(`id_vehicule = $${paramIndex++}`); values.push(id_vehicule); }
    if (id_chauffeur !== undefined) { updates.push(`id_chauffeur = $${paramIndex++}`); values.push(id_chauffeur); }
    if (id_beneficiaire !== undefined) { updates.push(`id_beneficiaire = $${paramIndex++}`); values.push(id_beneficiaire); }
    if (date_depart !== undefined) { updates.push(`date_depart = $${paramIndex++}`); values.push(date_depart); }
    if (lieu_depart !== undefined) { updates.push(`lieu_depart = $${paramIndex++}`); values.push(lieu_depart); }
    if (destination !== undefined) { updates.push(`destination = $${paramIndex++}`); values.push(destination); }
    if (type !== undefined) { updates.push(`type = $${paramIndex++}`); values.push(type); }
    if (statut !== undefined) { updates.push(`statut = $${paramIndex++}`); values.push(statut); }
    
    if (updates.length === 0) {
        return res.status(400).json({ error: "Aucune donnée à modifier" });
    }
    
    values.push(id);
    const query = `
        UPDATE course 
        SET ${updates.join(', ')}
        WHERE id_course = $${paramIndex}
        RETURNING id_course
    `;
    
    db.get(query, values, (err, result) => {
        if (err) {
            console.error('❌ Erreur UPDATE course:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!result) {
            return res.status(404).json({ error: "Course non trouvée" });
        }
        res.json({ 
            message: "Course modifiée avec succès",
            id: result.id_course
        });
    });
});

// ============================================
// DELETE Supprimer une course
// ============================================
router.delete('/:id', (req, res) => {
    const id = req.params.id;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }
    
    const query = `
        DELETE FROM course 
        WHERE id_course = $1
        RETURNING id_course
    `;
    
    db.get(query, [id], (err, result) => {
        if (err) {
            console.error('❌ Erreur DELETE course:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!result) {
            return res.status(404).json({ error: "Course non trouvée" });
        }
        res.json({ 
            message: "Course supprimée avec succès",
            id: result.id_course
        });
    });
});

module.exports = router;
