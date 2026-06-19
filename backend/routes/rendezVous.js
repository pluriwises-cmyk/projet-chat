const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// ============================================
// CONFIGURATION SUPABASE
// ============================================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

console.log('✅ Route rendezVous.js chargée avec Supabase');

// ============================================
// GET Tous les rendez-vous
// ============================================
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('rendez_vous')
            .select(`
                *,
                beneficiaire (nom, prenom)
            `)
            .order('date_rdv', { ascending: false });

        if (error) throw error;

        // Transformation pour le front-end
        const result = data.map(r => ({
            id_rdv: r.id_rdv,
            id_beneficiaire: r.id_beneficiaire,
            id_medecin: r.id_medecin,
            date_rdv: r.date_rdv,
            motif: r.motif,
            statut: r.statut,
            patient_nom: r.beneficiaire?.nom || null,
            patient_prenom: r.beneficiaire?.prenom || null
        }));

        res.json(result);
    } catch (err) {
        console.error('❌ Erreur GET rendez-vous:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Rendez-vous d'un médecin spécifique
// ============================================
router.get('/medecin/:id', async (req, res) => {
    const medecinId = req.params.id;

    if (!medecinId || isNaN(medecinId)) {
        return res.status(400).json({ error: "ID médecin invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('rendez_vous')
            .select(`
                *,
                beneficiaire (nom, prenom)
            `)
            .eq('id_medecin', medecinId)
            .order('date_rdv', { ascending: true })
            .limit(10);

        if (error) throw error;

        const result = data.map(r => ({
            id_rdv: r.id_rdv,
            id_beneficiaire: r.id_beneficiaire,
            id_medecin: r.id_medecin,
            date_rdv: r.date_rdv,
            motif: r.motif,
            statut: r.statut,
            patient_nom: r.beneficiaire?.nom || null,
            patient_prenom: r.beneficiaire?.prenom || null
        }));

        res.json(result);
    } catch (err) {
        console.error('❌ Erreur GET rendez-vous médecin:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Rendez-vous d'un patient spécifique
// ============================================
router.get('/patient/:id', async (req, res) => {
    const patientId = req.params.id;

    if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: "ID patient invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('rendez_vous')
            .select('*')
            .eq('id_beneficiaire', patientId)
            .order('date_rdv', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('❌ Erreur GET rendez-vous patient:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Rendez-vous d'aujourd'hui
// ============================================
router.get('/aujourdhui', async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('rendez_vous')
            .select(`
                *,
                beneficiaire (nom, prenom)
            `)
            .gte('date_rdv', startOfDay.toISOString())
            .lt('date_rdv', endOfDay.toISOString())
            .order('date_rdv', { ascending: true });

        if (error) throw error;

        const result = data.map(r => ({
            ...r,
            patient_nom: r.beneficiaire?.nom || null,
            patient_prenom: r.beneficiaire?.prenom || null,
            beneficiaire: undefined
        }));

        res.json(result);
    } catch (err) {
        console.error('❌ Erreur GET rendez-vous aujourd\'hui:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Rendez-vous d'une date spécifique
// ============================================
router.get('/date/:date', async (req, res) => {
    const date = req.params.date;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Format de date invalide. Utilisez YYYY-MM-DD" });
    }

    try {
        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(date + 'T23:59:59.999Z');

        const { data, error } = await supabase
            .from('rendez_vous')
            .select(`
                *,
                beneficiaire (nom, prenom)
            `)
            .gte('date_rdv', startOfDay.toISOString())
            .lt('date_rdv', endOfDay.toISOString())
            .order('date_rdv', { ascending: true });

        if (error) throw error;

        const result = data.map(r => ({
            ...r,
            patient_nom: r.beneficiaire?.nom || null,
            patient_prenom: r.beneficiaire?.prenom || null,
            beneficiaire: undefined
        }));

        res.json(result);
    } catch (err) {
        console.error('❌ Erreur GET rendez-vous par date:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// POST Ajouter un rendez-vous
// ============================================
router.post('/', async (req, res) => {
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

    try {
        // Vérifier que le patient existe
        const { data: patient, error: patientError } = await supabase
            .from('beneficiaire')
            .select('id_beneficiaire')
            .eq('id_beneficiaire', id_beneficiaire)
            .maybeSingle();

        if (patientError || !patient) {
            return res.status(404).json({ error: "Patient non trouvé" });
        }

        // Vérifier que le médecin existe
        const { data: medecin, error: medecinError } = await supabase
            .from('personnel')
            .select('id_personnel')
            .eq('id_personnel', id_medecin)
            .eq('poste', 'medecin')
            .maybeSingle();

        if (medecinError || !medecin) {
            return res.status(404).json({ error: "Médecin non trouvé" });
        }

        const { data, error } = await supabase
            .from('rendez_vous')
            .insert([{
                id_beneficiaire,
                id_medecin,
                date_rdv,
                motif: motif || '',
                statut: 'planifie'
            }])
            .select();

        if (error) throw error;

        res.status(201).json({
            success: true,
            id: data[0].id_rdv,
            message: "Rendez-vous ajouté avec succès"
        });
    } catch (err) {
        console.error('❌ Erreur POST rendez-vous:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PUT Modifier un rendez-vous
// ============================================
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { date_rdv, motif, statut } = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const updates = {};
        if (date_rdv !== undefined) updates.date_rdv = date_rdv;
        if (motif !== undefined) updates.motif = motif;
        if (statut !== undefined) updates.statut = statut;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "Aucune donnée à modifier" });
        }

        const { data, error } = await supabase
            .from('rendez_vous')
            .update(updates)
            .eq('id_rdv', id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Rendez-vous non trouvé" });
        }

        res.json({
            success: true,
            message: "Rendez-vous modifié avec succès",
            id: data[0].id_rdv
        });
    } catch (err) {
        console.error('❌ Erreur PUT rendez-vous:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// DELETE Supprimer un rendez-vous
// ============================================
router.delete('/:id', async (req, res) => {
    const id = req.params.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('rendez_vous')
            .delete()
            .eq('id_rdv', id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Rendez-vous non trouvé" });
        }

        res.json({
            success: true,
            message: "Rendez-vous supprimé avec succès",
            id: data[0].id_rdv
        });
    } catch (err) {
        console.error('❌ Erreur DELETE rendez-vous:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
