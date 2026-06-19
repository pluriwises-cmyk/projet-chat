const express = require('express');
const router = express.Router();
const db = require('../database/db');

// ============================================
// GET Tous les rendez-vous
// ============================================
router.get('/', (req, res) => {
    const query = `
        SELECT 
            rendez_vous.id_rdv, 
            rendez_vous.id_beneficiaire, 
            rendez_vous.id_medecin, 
            rendez_vous.date_rdv, 
            rendez_vous.motif, 
            rendez_vous.statut,
            beneficiaire.nom as patient_nom, 
            beneficiaire.prenom as patient_prenom
        FROM rendez_vous
        LEFT JOIN beneficiaire ON rendez_vous.id_beneficiaire = beneficiaire.id_beneficiaire
        ORDER BY rendez_vous.date_rdv DESC
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
// GET Rendez-vous d'un médecin spécifique (SIMPLIFIÉ)
// ============================================
router.get('/medecin/:id', (req, res) => {
    const medecinId = req.params.id;
    
    if (!medecinId || isNaN(medecinId)) {
        return res.status(400).json({ error: "ID médecin invalide" });
    }
    
    // ✅ Version simplifiée - pas de jointure
    db.all(
        'SELECT * FROM rendez_vous WHERE id_medecin = $1 ORDER BY date_rdv ASC LIMIT 10',
        [medecinId],
        (err, rows) => {
            if (err) {
                console.error('Erreur GET rendez-vous médecin:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows || []);
        }
    );
});

// ============================================
// GET Rendez-vous d'un patient spécifique (SIMPLIFIÉ)
// ============================================
router.get('/patient/:id', (req, res) => {
    const patientId = req.params.id;
    
    if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: "ID patient invalide" });
    }
    
    db.all(
        'SELECT * FROM rendez_vous WHERE id_beneficiaire = $1 ORDER BY date_rdv DESC',
        [patientId],
        (err, rows) => {
            if (err) {
                console.error('Erreur GET rendez-vous patient:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows || []);
        }
    );
});

// ============================================
// GET Rendez-vous d'aujourd'hui
// ============================================
router.get('/aujourdhui', (req, res) => {
    const query = `
        SELECT 
            rendez_vous.id_rdv, 
            rendez_vous.id_beneficiaire, 
            rendez_vous.id_medecin, 
            rendez_vous.date_rdv, 
            rendez_vous.motif, 
            rendez_vous.statut,
            beneficiaire.nom as patient_nom, 
            beneficiaire.prenom as patient_prenom
        FROM rendez_vous
        LEFT JOIN beneficiaire ON rendez_vous.id_beneficiaire = beneficiaire.id_beneficiaire
        WHERE DATE(rendez_vous.date_rdv) = CURRENT_DATE
        ORDER BY rendez_vous.date_rdv ASC
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
    const date = req.params.date;
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Format de date invalide. Utilisez YYYY-MM-DD" });
    }
    
    const query = `
        SELECT 
            rendez_vous.id_rdv, 
            rendez_vous.id_beneficiaire, 
            rendez_vous.id_medecin, 
            rendez_vous.date_rdv, 
            rendez_vous.motif, 
            rendez_vous.statut,
            beneficiaire.nom as patient_nom, 
            beneficiaire.prenom as patient_prenom
        FROM rendez_vous
        LEFT JOIN beneficiaire ON rendez_vous.id_beneficiaire = beneficiaire.id_beneficiaire
        WHERE DATE(rendez_vous.date_rdv) = $1
        ORDER BY rendez_vous.date_rdv ASC
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
// POST Ajouter un rendez-vous
// ============================================
router.post('/', (req, res) => {
    const { id_beneficiaire, id_medecin, date_rdv, motif } = req.body;
    
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
            
            // Vérifier que le médecin existe
            db.get('SELECT id_personnel FROM personnel WHERE id_personnel = $1 AND poste = $2', 
                [id_medecin, 'medecin'], 
                (err, medecin) => {
                    if (err) {
                        console.error('Erreur vérification médecin:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    if (!medecin) {
                        return res.status(404).json({ error: "Médecin non trouvé" });
                    }
                    
                    db.get(
                        `INSERT INTO rendez_vous 
                         (id_beneficiaire, id_medecin, date_rdv, motif, statut)
                         VALUES ($1, $2, $3, $4, 'planifie') 
                         RETURNING id_rdv`,
                        [id_beneficiaire, id_medecin, date_rdv, motif || ''],
                        (err, result) => {
                            if (err) {
                                console.error('Erreur insertion rendez-vous:', err);
                                if (err.message.includes('UNIQUE constraint')) {
                                    return res.status(409).json({ 
                                        error: "Ce créneau est déjà pris pour ce médecin" 
                                    });
                                }
                                return res.status(500).json({ error: err.message });
                            }
                            res.status(201).json({ 
                                id: result.id_rdv, 
                                message: "Rendez-vous ajouté avec succès" 
                            });
                        }
                    );
                }
            );
        }
    );
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
    db.get(
        `UPDATE rendez_vous SET ${updates.join(', ')} WHERE id_rdv = $${paramIndex} RETURNING id_rdv`,
        values,
        (err, result) => {
            if (err) {
                console.error('Erreur UPDATE rendez-vous:', err);
                return res.status(500).json({ error: err.message });
            }
            if (!result) {
                return res.status(404).json({ error: "Rendez-vous non trouvé" });
            }
            res.json({ message: "Rendez-vous modifié avec succès" });
        }
    );
});

// ============================================
// DELETE Supprimer un rendez-vous
// ============================================
router.delete('/:id', (req, res) => {
    const id = req.params.id;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }
    
    db.get(
        'DELETE FROM rendez_vous WHERE id_rdv = $1 RETURNING id_rdv',
        [id],
        (err, result) => {
            if (err) {
                console.error('Erreur DELETE rendez-vous:', err);
                return res.status(500).json({ error: err.message });
            }
            if (!result) {
                return res.status(404).json({ error: "Rendez-vous non trouvé" });
            }
            res.json({ message: "Rendez-vous supprimé avec succès" });
        }
    );
});

module.exports = router;
