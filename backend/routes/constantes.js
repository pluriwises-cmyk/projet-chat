const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

console.log('✅ Route constantes.js chargée avec Supabase');

// ============================================
// GET Toutes les constantes (avec jointure patient)
// ============================================
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('constante')
            .select(`
                id_constante,
                id_beneficiaire,
                date_prise,
                tension,
                pouls,
                temperature,
                saturation,
                chambre,
                beneficiaire (nom, prenom)
            `)
            .order('date_prise', { ascending: false });

        if (error) throw error;

        // Transformation pour garder la même structure que ton front attend
        const result = data.map(c => ({
            id_constante: c.id_constante,
            id_beneficiaire: c.id_beneficiaire,
            date_prise: c.date_prise,
            tension: c.tension,
            pouls: c.pouls,
            temperature: c.temperature,
            saturation: c.saturation,
            chambre: c.chambre,
            patient_nom: c.beneficiaire?.nom || null,
            patient_prenom: c.beneficiaire?.prenom || null
        }));

        res.json(result);
    } catch (err) {
        console.error('❌ Erreur GET constantes:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Constantes d'aujourd'hui
// ============================================
router.get('/aujourdhui', async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('constante')
            .select(`
                id_constante,
                id_beneficiaire,
                date_prise,
                tension,
                pouls,
                temperature,
                saturation,
                chambre,
                beneficiaire (nom, prenom)
            `)
            .gte('date_prise', startOfDay.toISOString())
            .lt('date_prise', endOfDay.toISOString())
            .order('date_prise', { ascending: false });

        if (error) throw error;

        const result = data.map(c => ({
            ...c,
            patient_nom: c.beneficiaire?.nom || null,
            patient_prenom: c.beneficiaire?.prenom || null,
            beneficiaire: undefined
        }));

        res.json(result);
    } catch (err) {
        console.error('❌ Erreur GET constantes aujourd\'hui:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Constantes d'un patient spécifique
// ============================================
router.get('/patient/:id', async (req, res) => {
    const patientId = req.params.id;
    if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: "ID patient invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('constante')
            .select('*')
            .eq('id_beneficiaire', patientId)
            .order('date_prise', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('❌ Erreur GET constantes patient:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Une constante par ID
// ============================================
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('constante')
            .select(`
                id_constante,
                id_beneficiaire,
                date_prise,
                tension,
                pouls,
                temperature,
                saturation,
                chambre,
                beneficiaire (nom, prenom)
            `)
            .eq('id_constante', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ error: "Constante non trouvée" });
        }

        const result = {
            ...data,
            patient_nom: data.beneficiaire?.nom || null,
            patient_prenom: data.beneficiaire?.prenom || null,
            beneficiaire: undefined
        };

        res.json(result);
    } catch (err) {
        console.error('❌ Erreur GET constante:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// POST Ajouter des constantes
// ============================================
router.post('/', async (req, res) => {
    const { id_beneficiaire, tension, pouls, temperature, saturation, chambre } = req.body;

    if (!id_beneficiaire) {
        return res.status(400).json({ error: "ID bénéficiaire requis" });
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

        const { data, error } = await supabase
            .from('constante')
            .insert([{
                id_beneficiaire,
                tension: tension || '',
                pouls: pouls || null,
                temperature: temperature || null,
                saturation: saturation || null,
                chambre: chambre || '',
                date_prise: new Date().toISOString()
            }])
            .select();

        if (error) throw error;

        res.status(201).json({
            success: true,
            id: data[0].id_constante,
            message: "Constante enregistrée avec succès"
        });
    } catch (err) {
        console.error('❌ Erreur POST constante:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PUT Modifier des constantes
// ============================================
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { tension, pouls, temperature, saturation, chambre } = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const updates = {};
        if (tension !== undefined) updates.tension = tension;
        if (pouls !== undefined) updates.pouls = pouls;
        if (temperature !== undefined) updates.temperature = temperature;
        if (saturation !== undefined) updates.saturation = saturation;
        if (chambre !== undefined) updates.chambre = chambre;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "Aucune donnée à modifier" });
        }

        const { data, error } = await supabase
            .from('constante')
            .update(updates)
            .eq('id_constante', id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Constante non trouvée" });
        }

        res.json({
            success: true,
            message: "Constantes modifiées avec succès",
            id: data[0].id_constante
        });
    } catch (err) {
        console.error('❌ Erreur PUT constante:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// DELETE Supprimer des constantes
// ============================================
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('constante')
            .delete()
            .eq('id_constante', id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Constante non trouvée" });
        }

        res.json({
            success: true,
            message: "Constantes supprimées avec succès",
            id: data[0].id_constante
        });
    } catch (err) {
        console.error('❌ Erreur DELETE constante:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
