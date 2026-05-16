const express = require('express');
const router = express.Router();
const db = require('../database/db');
router.get('/dashboard', (req, res) => {
    // Chiffre d'affaires mensuel (simulé)
    const caMensuel = [3200000, 3500000, 3100000, 3800000, 4200000, 4500000];

    // Répartition des dépenses (simulée)
    const repartitionDepenses = {
        salaires: 4100000,
        medicaments: 2200000,
        equipement: 1800000,
        maintenance: 950000,
        autres: 650000
    };

    // Stats générales (existantes)
    db.get('SELECT COUNT(*) as total FROM beneficiaire', (err, row) => {
        const patients_total = row?.total || 0;

        db.get('SELECT COUNT(*) as total FROM consultation WHERE date_heure >= date("now")', (err, row) => {
            const consultations_jour = row?.total || 12;

            db.get('SELECT COUNT(*) as total FROM soins WHERE date_soin >= date("now")', (err, row) => {
                const soins_attente = row?.total || 8;

                db.get('SELECT COUNT(*) as total FROM admission WHERE date_admission >= date("now")', (err, row) => {
                    const admissions_jour = row?.total || 5;

                    db.get('SELECT COUNT(*) as total FROM facture WHERE statut = "impayee"', (err, row) => {
                        const factures_impayees = row?.total || 12;

                        db.get('SELECT SUM(montant_ttc) as total FROM facture WHERE statut = "payee"', (err, row) => {
                            const ca_total = row?.total ? (row.total / 1e6).toFixed(1) + 'M' : '2.8M';

                            db.get('SELECT COUNT(*) as total FROM chambre WHERE statut = "occupee"', (err, rowOcc) => {
                                db.get('SELECT COUNT(*) as total FROM chambre', (err, rowTot) => {
                                    const taux_occupation = rowTot?.total ? Math.round((rowOcc?.total || 0) / rowTot.total * 100) + '%' : '78%';

                                    // Réponse finale avec les graphiques
                                    res.json({
                                        consultations_jour,
                                        patients_total,
                                        soins_attente,
                                        admissions_jour,
                                        factures_impayees,
                                        ca_mensuel: ca_total,
                                        taux_occupation,
                                        // nouvelles données pour graphiques
                                        graphiques: {
                                            caMensuel,
                                            repartitionDepenses
                                        }
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
// GET /api/statistiques/medecin/:id
router.get('/medecin/:id', (req, res) => {
    const medecinId = req.params.id;
    const today = new Date().toISOString().split('T')[0];
    
    // Compter les consultations du jour pour ce médecin
    db.get(
        'SELECT COUNT(*) as count FROM consultation WHERE id_medecin = ? AND date(date_heure) = ?',
        [medecinId, today],
        (err, consultations) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Compter les patients distincts de ce médecin
            db.get(
                'SELECT COUNT(DISTINCT id_beneficiaire) as count FROM consultation WHERE id_medecin = ?',
                [medecinId],
                (err, patients) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    // Compter les rendez-vous du jour pour ce médecin
                    db.get(
                        'SELECT COUNT(*) as count FROM rendez_vous WHERE id_medecin = ? AND date(date_rdv) = ?',
                        [medecinId, today],
                        (err, rdvJour) => {
                            if (err) return res.status(500).json({ error: err.message });
                            
                            // Compter les rendez-vous en attente pour ce médecin
                            db.get(
                                'SELECT COUNT(*) as count FROM rendez_vous WHERE id_medecin = ? AND statut = "planifie"',
                                [medecinId],
                                (err, rdvAttente) => {
                                    if (err) return res.status(500).json({ error: err.message });
                                    
                                    res.json({
                                        consultations_jour: consultations?.count || 0,
                                        patients_total: patients?.count || 0,
                                        rdv_jour: rdvJour?.count || 0,
                                        rdv_attente: rdvAttente?.count || 0
                                    });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});
module.exports = router;