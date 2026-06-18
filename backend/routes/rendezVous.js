const express = require('express');
const router = express.Router();
const db = require('../database/db');

// ============================================
// GET Tous les rendez-vous (avec ordre)
// ============================================
router.get('/', (req, res) => {
    const query = `
        SELECT r.*, 
               b.nom as patient_nom, 
               b.prenom as patient_prenom
        FROM rendez_vous r
        LEFT JOIN beneficiaire b ON r.id_beneficiaire = b.id_beneficiaire
        ORDER BY r.date_rdv DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erreur GET rendez-vous:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// ============================================
// GET Rendez-vous d'aujourd'hui (POSTGRESQL FIX)
// ============================================
router.get('/aujourdhui', (req, res) => {
    // ✅ PostgreSQL : CURRENT_DATE au lieu de DATE('now')
    const query = `
        SELECT r.*, 
               b.nom as patient_nom, 
               b.prenom as patient_prenom
        FROM rendez_vous r
        LEFT JOIN beneficiaire b ON r.id_beneficiaire = b.id_beneficiaire
        WHERE DATE(r.date_rdv) = CURRENT_DATE
        ORDER BY r.date_rdv ASC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erreur GET rendez-vous aujourd\'hui:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// ============================================
// GET Rendez-vous d'une date spécifique
// ============================================
router.get('/date/:date', (req, res) => {
    const date = req.params.date; // Format: YYYY-MM-DD
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Format de date invalide. Utilisez YYYY-MM-DD" });
    }
    
    const query = `
        SELECT r.*, 
               b.nom as patient_nom, 
               b.prenom as patient_prenom
        FROM rendez_vous r
        LEFT JOIN beneficiaire b ON r.id_beneficiaire = b.id_beneficiaire
        WHERE DATE(r.date_rdv) = $1
        ORDER BY r.date_rdv ASC
    `;
    
    db.all(query, [date], (err, rows) => {
        if (err) {
            console.error('Erreur GET rendez-vous par date:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// ============================================
// POST Ajouter un rendez-vous (UNIQUE)
// ============================================
router.post('/', (req, res) => {
    const { id_beneficiaire, id_medecin, date_rdv, motif } = req.body;
    
    // Validation
    if (!id_beneficiaire || !id_medecin || !date_rdv) {
        return res.status(400).json({ 
            error: "Tous les champs sont requis",
            details: {
                id_beneficiaire: !!id_beneficiaire,
                id_medecin: !!id_medecin,
                date_rdv: !!date_rdv
            }
        });
    }
    
    // Vérifier que le patient existe (PostgreSQL)
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
            
            // Vérifier que le médecin existe
            db.get('SELECT id_medecin FROM medecin WHERE id_medecin = $1', 
                [id_medecin], 
                (err, medecin) => {
                    if (err) {
                        console.error('Erreur vérification médecin:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    if (!medecin) {
                        return res.status(404).json({ error: "Médecin non trouvé" });
                    }
                    
                    // Insertion du rendez-vous
                    const query = `
                        INSERT INTO rendez_vous 
                        (id_beneficiaire, id_medecin, date_rdv, motif, statut)
                        VALUES ($1, $2, $3, $4, 'planifie')
                        RETURNING id_rendez_vous
                    `;
                    
                    db.get(query, [id_beneficiaire, id_medecin, date_rdv, motif || ''], (err, result) => {
                        if (err) {
                            console.error('Erreur insertion rendez-vous:', err);
                            
                            // Détecter les conflits de contrainte
                            if (err.message.includes('UNIQUE constraint')) {
                                return res.status(409).json({ 
                                    error: "Ce créneau est déjà pris pour ce médecin" 
                                });
                            }
                            
                            return res.status(500).json({ error: err.message });
                        }
                        
                        res.status(201).json({ 
                            id: result.id_rendez_vous, 
                            message: "Rendez-vous ajouté avec succès" 
                        });
                    });
                }
            );
        }
    );
});

// ============================================
// GET Rendez-vous d'un patient spécifique
// ============================================
router.get('/patient/:id', (req, res) => {
    const patientId = req.params.id;
    
    if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: "ID patient invalide" });
    }
    
    const query = `
        SELECT r.*, 
               b.nom as patient_nom, 
               b.prenom as patient_prenom
        FROM rendez_vous r
        LEFT JOIN beneficiaire b ON r.id_beneficiaire = b.id_beneficiaire
        WHERE r.id_beneficiaire = $1
        ORDER BY r.date_rdv DESC
    `;
    
    db.all(query, [patientId], (err, rows) => {
        if (err) {
            console.error('Erreur GET rendez-vous patient:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// ============================================
// GET Rendez-vous d'un médecin spécifique
// ============================================
router.get('/medecin/:id', (req, res) => {
    const medecinId = req.params.id;
    
    if (!medecinId || isNaN(medecinId)) {
        return res.status(400).json({ error: "ID médecin invalide" });
    }
    
    const query = `
        SELECT r.*, 
               b.nom as patient_nom, 
               b.prenom as patient_prenom
        FROM rendez_vous r
        LEFT JOIN beneficiaire b ON r.id_beneficiaire = b.id_beneficiaire
        WHERE r.id_medecin = $1
        ORDER BY r.date_rdv ASC
        LIMIT 10
    `;
    
    db.all(query, [medecinId], (err, rows) => {
        if (err) {
            console.error('Erreur GET rendez-vous médecin:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// ============================================
// PUT Modifier un rendez-vous
// ============================================
router.put('/:id', (req, res) => {
    const id = req.params.id;
    const { date_rdv, motif, statut } = req.body;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }
    
    // Construction dynamique de la requête
    let updates = [];
    let values = [];
    let paramIndex = 1;
    
    if (date_rdv) { 
        updates.push(`date_rdv = $${paramIndex++}`); 
        values.push(date_rdv); 
    }
    if (motif) { 
        updates.push(`motif = $${paramIndex++}`); 
        values.push(motif); 
    }
    if (statut) { 
        updates.push(`statut = $${paramIndex++}`); 
        values.push(statut); 
    }
    
    if (updates.length === 0) {
        return res.status(400).json({ error: "Aucune donnée à modifier" });
    }
    
    values.push(id);
    const query = `
        UPDATE rendez_vous 
        SET ${updates.join(', ')}
        WHERE id_rendez_vous = $${paramIndex}
        RETURNING id_rendez_vous
    `;
    
    db.get(query, values, (err, result) => {
        if (err) {
            console.error('Erreur UPDATE rendez-vous:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!result) {
            return res.status(404).json({ error: "Rendez-vous non trouvé" });
        }
        res.json({ message: "Rendez-vous modifié avec succès" });
    });
});

// ============================================
// DELETE Supprimer un rendez-vous
// ============================================
router.delete('/:id', (req, res) => {
    const id = req.params.id;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }
    
    const query = `
        DELETE FROM rendez_vous 
        WHERE id_rendez_vous = $1
        RETURNING id_rendez_vous
    `;
    
    db.get(query, [id], (err, result) => {
        if (err) {
            console.error('Erreur DELETE rendez-vous:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!result) {
            return res.status(404).json({ error: "Rendez-vous non trouvé" });
        }
        res.json({ message: "Rendez-vous supprimé avec succès" });
    });
});

module.exports = router;
