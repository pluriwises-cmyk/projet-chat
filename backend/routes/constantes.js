const express = require('express');
const router = express.Router();
const db = require('../database/db');

// ============================================
// GET Toutes les constantes
// ============================================
router.get('/', (req, res) => {
    const query = `
        SELECT 
            constante.id_constante,
            constante.id_beneficiaire,
            constante.date_prise,
            constante.tension,
            constante.pouls,
            constante.temperature,
            constante.saturation,
            constante.chambre,
            beneficiaire.nom as patient_nom,
            beneficiaire.prenom as patient_prenom
        FROM constante
        LEFT JOIN beneficiaire ON constante.id_beneficiaire = beneficiaire.id_beneficiaire
        ORDER BY constante.date_prise DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erreur GET constantes:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// ============================================
// GET Constantes d'aujourd'hui
// ============================================
router.get('/aujourdhui', (req, res) => {
    const query = `
        SELECT 
            constante.id_constante,
            constante.id_beneficiaire,
            constante.date_prise,
            constante.tension,
            constante.pouls,
            constante.temperature,
            constante.saturation,
            constante.chambre,
            beneficiaire.nom as patient_nom,
            beneficiaire.prenom as patient_prenom
        FROM constante
        LEFT JOIN beneficiaire ON constante.id_beneficiaire = beneficiaire.id_beneficiaire
        WHERE DATE(constante.date_prise) = CURRENT_DATE
        ORDER BY constante.date_prise DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erreur GET constantes aujourd\'hui:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// ============================================
// GET Constantes d'un patient spécifique
// ============================================
router.get('/patient/:id', (req, res) => {
    const patientId = req.params.id;
    
    if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: "ID patient invalide" });
    }
    
    const query = `
        SELECT 
            constante.id_constante,
            constante.id_beneficiaire,
            constante.date_prise,
            constante.tension,
            constante.pouls,
            constante.temperature,
            constante.saturation,
            constante.chambre
        FROM constante
        WHERE constante.id_beneficiaire = $1
        ORDER BY constante.date_prise DESC
    `;
    
    db.all(query, [patientId], (err, rows) => {
        if (err) {
            console.error('Erreur GET constantes patient:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// ============================================
// GET Une constante par ID
// ============================================
router.get('/:id', (req, res) => {
    const id = req.params.id;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }
    
    const query = `
        SELECT 
            constante.id_constante,
            constante.id_beneficiaire,
            constante.date_prise,
            constante.tension,
            constante.pouls,
            constante.temperature,
            constante.saturation,
            constante.chambre,
            beneficiaire.nom as patient_nom,
            beneficiaire.prenom as patient_prenom
        FROM constante
        LEFT JOIN beneficiaire ON constante.id_beneficiaire = beneficiaire.id_beneficiaire
        WHERE constante.id_constante = $1
    `;
    
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('Erreur GET constante:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "Constante non trouvée" });
        }
        res.json(row);
    });
});

// ============================================
// POST Ajouter des constantes vitales
// ============================================
router.post('/', (req, res) => {
    const { id_beneficiaire, tension, pouls, temperature, saturation, chambre } = req.body;
    
    if (!id_beneficiaire) {
        return res.status(400).json({ error: "ID bénéficiaire requis" });
    }

    // Vérifier que le patient existe
    db.get('SELECT id_beneficiaire FROM beneficiaire WHERE id_beneficiaire = $1', 
        [id_beneficiaire], 
        (err, patient) => {
            if (err) {
                console.error('Erreur vérification patient:', err);
                return res.status(500).json({ error: err.message });
            }
            if (!patient) {
                return res.status(404).json({ error: "Patient non trouvé" });
            }

            const query = `
                INSERT INTO constante 
                (id_beneficiaire, tension, pouls, temperature, saturation, chambre, date_prise)
                VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                RETURNING id_constante
            `;

            db.get(query, [
                id_beneficiaire, 
                tension || '', 
                pouls || null, 
                temperature || null, 
                saturation || null, 
                chambre || ''
            ], (err, result) => {
                if (err) {
                    console.error('Erreur POST constante:', err);
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ 
                    id: result.id_constante, 
                    message: "Constante enregistrée avec succès" 
                });
            });
        }
    );
});

// ============================================
// PUT Modifier des constantes
// ============================================
router.put('/:id', (req, res) => {
    const id = req.params.id;
    const { tension, pouls, temperature, saturation, chambre } = req.body;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }
    
    // Construire la liste des champs à mettre à jour
    let updates = [];
    let values = [];
    let paramIndex = 1;
    
    if (tension !== undefined) { 
        updates.push(`tension = $${paramIndex++}`); 
        values.push(tension); 
    }
    if (pouls !== undefined) { 
        updates.push(`pouls = $${paramIndex++}`); 
        values.push(pouls); 
    }
    if (temperature !== undefined) { 
        updates.push(`temperature = $${paramIndex++}`); 
        values.push(temperature); 
    }
    if (saturation !== undefined) { 
        updates.push(`saturation = $${paramIndex++}`); 
        values.push(saturation); 
    }
    if (chambre !== undefined) { 
        updates.push(`chambre = $${paramIndex++}`); 
        values.push(chambre); 
    }
    
    if (updates.length === 0) {
        return res.status(400).json({ error: "Aucune donnée à modifier" });
    }
    
    values.push(id);
    const query = `
        UPDATE constante 
        SET ${updates.join(', ')}
        WHERE id_constante = $${paramIndex}
        RETURNING id_constante
    `;
    
    db.get(query, values, (err, result) => {
        if (err) {
            console.error('Erreur UPDATE constante:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!result) {
            return res.status(404).json({ error: "Constante non trouvée" });
        }
        res.json({ 
            message: "Constantes modifiées avec succès",
            id: result.id_constante
        });
    });
});

// ============================================
// DELETE Supprimer des constantes
// ============================================
router.delete('/:id', (req, res) => {
    const id = req.params.id;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }
    
    const query = `
        DELETE FROM constante 
        WHERE id_constante = $1
        RETURNING id_constante
    `;
    
    db.get(query, [id], (err, result) => {
        if (err) {
            console.error('Erreur DELETE constante:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!result) {
            return res.status(404).json({ error: "Constante non trouvée" });
        }
        res.json({ 
            message: "Constantes supprimées avec succès",
            id: result.id_constante
        });
    });
});

module.exports = router;
