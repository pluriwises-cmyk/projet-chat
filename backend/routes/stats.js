const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Statistiques globales (pour direction/boss)
router.get('/dashboard', (req, res) => {
    Promise.all([
        new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as total FROM beneficiaire', (err, row) => {
                if (err) reject(err);
                else resolve(row?.total || 0);
            });
        }),
        new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as total FROM consultation WHERE date(date_heure) = date("now")', (err, row) => {
                if (err) reject(err);
                else resolve(row?.total || 0);
            });
        }),
        new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as total FROM rendez_vous WHERE date(date_rdv) = date("now")', (err, row) => {
                if (err) reject(err);
                else resolve(row?.total || 0);
            });
        }),
        new Promise((resolve, reject) => {
            db.get('SELECT SUM(montant_ttc) as total FROM facture WHERE statut = "payee"', (err, row) => {
                if (err) reject(err);
                else resolve(row?.total || 0);
            });
        })
    ]).then(([patients, consultations, rendezVous, chiffreAffaire]) => {
        res.json({
            patients_total: patients,
            consultations_jour: consultations,
            rendez_vous_jour: rendezVous,
            chiffre_affaire: chiffreAffaire
        });
    }).catch(err => {
        res.status(500).json({ error: err.message });
    });
});

// Statistiques par médecin
router.get('/medecin/:id', (req, res) => {
    const medecinId = req.params.id;
    const today = new Date().toISOString().split('T')[0];
    
    db.get('SELECT COUNT(*) as count FROM consultation WHERE id_medecin = ? AND date(date_heure) = ?', 
        [medecinId, today], (err, consultations) => {
            db.get('SELECT COUNT(DISTINCT id_beneficiaire) as count FROM consultation WHERE id_medecin = ?', 
                [medecinId], (err, patients) => {
                    db.get('SELECT COUNT(*) as count FROM rendez_vous WHERE id_medecin = ? AND date(date_rdv) = ?', 
                        [medecinId, today], (err, rdvJour) => {
                            db.get('SELECT COUNT(*) as count FROM rendez_vous WHERE id_medecin = ? AND statut = "planifie"', 
                                [medecinId], (err, rdvAttente) => {
                                    res.json({
                                        consultations_jour: consultations?.count || 0,
                                        patients_total: patients?.count || 0,
                                        rdv_jour: rdvJour?.count || 0,
                                        rdv_attente: rdvAttente?.count || 0
                                    });
                                });
                        });
                });
        });
});

module.exports = router;