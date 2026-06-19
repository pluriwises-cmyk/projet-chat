const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

console.log('✅ Route statistiques.js chargée avec Supabase');

// ============================================
// DASHBOARD GLOBAL
// ============================================
router.get('/dashboard', async (req, res) => {
    try {
        // Date du jour avec intervalle
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const startOfDayISO = startOfDay.toISOString();

        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        const endOfDayISO = endOfDay.toISOString();

        // Exécution en parallèle
        const [
            patients,
            consultations,
            soins,
            admissions,
            impayees,
            caTotal,
            chambres
        ] = await Promise.all([
            // Total patients
            supabase
                .from('beneficiaire')
                .select('*', { count: 'exact', head: true }),

            // Consultations du jour
            supabase
                .from('consultation')
                .select('*', { count: 'exact', head: true })
                .gte('date_heure', startOfDayISO)
                .lt('date_heure', endOfDayISO),

            // Soins du jour
            supabase
                .from('soins')
                .select('*', { count: 'exact', head: true })
                .gte('date_soin', startOfDayISO)
                .lt('date_soin', endOfDayISO),

            // Admissions du jour
            supabase
                .from('admission')
                .select('*', { count: 'exact', head: true })
                .gte('date_admission', startOfDayISO)
                .lt('date_admission', endOfDayISO),

            // Factures impayées
            supabase
                .from('facture')
                .select('*', { count: 'exact', head: true })
                .eq('statut', 'impayee'),

            // ✅ CA TOTAL via RPC
            supabase.rpc('get_ca_total'),

            // Taux d'occupation
            supabase
                .from('chambre')
                .select('statut')
        ]);

        // Vérification des erreurs
        const errors = [patients, consultations, soins, admissions, impayees, caTotal, chambres]
            .filter(result => result.error)
            .map(result => result.error);

        if (errors.length > 0) {
            console.error('Erreurs Supabase:', errors);
            return res.status(500).json({
                error: 'Erreur lors de la récupération des données',
                details: errors
            });
        }

        // Calculs
        const caValue = caTotal.data || 0;
        const occupees = chambres.data?.filter(c => c.statut === 'occupee').length || 0;
        const totalChambres = chambres.data?.length || 0;
        const tauxOccupation = totalChambres > 0
            ? Math.round((occupees / totalChambres) * 100)
            : 0;

        res.json({
            patients_total: patients.count || 0,
            consultations_jour: consultations.count || 0,
            soins_attente: soins.count || 0,
            admissions_jour: admissions.count || 0,
            factures_impayees: impayees.count || 0,
            ca_total: (caValue / 1e6).toFixed(1) + 'M',
            taux_occupation: tauxOccupation + '%',
            graphiques: {
                caMensuel: [3200000, 3500000, 3100000, 3800000, 4200000, 4500000],
                repartitionDepenses: {
                    salaires: 4100000,
                    medicaments: 2200000,
                    equipement: 1800000,
                    maintenance: 950000,
                    autres: 650000
                }
            }
        });
    } catch (err) {
        console.error('Erreur dashboard:', err);
        res.status(500).json({
            error: 'Erreur serveur',
            details: err.message
        });
    }
});

// ============================================
// STATS MÉDECIN
// ============================================
router.get('/medecin/:id', async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID médecin invalide" });
    }

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayISO = startOfDay.toISOString();

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    const endOfDayISO = endOfDay.toISOString();

    try {
        // Vérifier que le médecin existe
        const { data: medecin, error: medecinError } = await supabase
            .from('medecin')
            .select('id_medecin, nom, prenom')
            .eq('id_medecin', id)
            .single();

        if (medecinError || !medecin) {
            return res.status(404).json({ error: "Médecin non trouvé" });
        }

        // Requêtes parallèles
        const [consult, patients, rdvJour, rdvAttente] = await Promise.all([
            // Consultations du jour
            supabase
                .from('consultation')
                .select('*', { count: 'exact', head: true })
                .eq('id_medecin', id)
                .gte('date_heure', startOfDayISO)
                .lt('date_heure', endOfDayISO),

            // Patients distincts
            supabase
                .from('consultation')
                .select('id_beneficiaire', { count: 'exact', head: true })
                .eq('id_medecin', id),

            // Rendez-vous du jour
            supabase
                .from('rendez_vous')
                .select('*', { count: 'exact', head: true })
                .eq('id_medecin', id)
                .gte('date_rdv', startOfDayISO)
                .lt('date_rdv', endOfDayISO),

            // Rendez-vous en attente
            supabase
                .from('rendez_vous')
                .select('*', { count: 'exact', head: true })
                .eq('id_medecin', id)
                .eq('statut', 'planifie')
        ]);

        // Vérification des erreurs
        const errors = [consult, patients, rdvJour, rdvAttente]
            .filter(result => result.error)
            .map(result => result.error);

        if (errors.length > 0) {
            console.error('Erreurs stats médecin:', errors);
            return res.status(500).json({
                error: 'Erreur lors de la récupération des statistiques',
                details: errors
            });
        }

        res.json({
            medecin: {
                id: medecin.id_medecin,
                nom: medecin.nom,
                prenom: medecin.prenom
            },
            consultations_jour: consult.count || 0,
            patients_total: patients.count || 0,
            rdv_jour: rdvJour.count || 0,
            rdv_attente: rdvAttente.count || 0
        });
    } catch (err) {
        console.error('Erreur stats médecin:', err);
        res.status(500).json({
            error: 'Erreur serveur',
            details: err.message
        });
    }
});

// ============================================
// STATS MENSUELLES (Évolution)
// ============================================
router.get('/mensuelles', async (req, res) => {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthsAgoISO = sixMonthsAgo.toISOString();

        const { data, error } = await supabase
            .from('consultation')
            .select('date_heure')
            .gte('date_heure', sixMonthsAgoISO);

        if (error) throw error;

        // Regrouper par mois
        const mois = {};
        data?.forEach(row => {
            const date = new Date(row.date_heure);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            mois[key] = (mois[key] || 0) + 1;
        });

        const result = Object.entries(mois).map(([mois, total]) => ({
            mois,
            total
        })).sort((a, b) => a.mois.localeCompare(b.mois));

        res.json(result);
    } catch (err) {
        console.error('Erreur stats mensuelles:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
