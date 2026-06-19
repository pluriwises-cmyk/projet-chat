const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialisation Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

console.log('✅ Route admissions.js chargée avec Supabase');

// ============================================
// GET Toutes les admissions (avec jointure patient)
// ============================================
router.get('/', async (req, res) => {
    try {
        // ✅ CORRECTION : Table 'admission' (singulier)
        const { data, error } = await supabase
            .from('admission')
            .select(`
                *,
                beneficiaire (nom, prenom)
            `)
            .order('date_admission', { ascending: false });

        if (error) throw error;

        // Transformation pour conserver la structure attendue par ton front-end
        const result = data.map(a => ({
            id_admission: a.id_admission,
            id_beneficiaire: a.id_beneficiaire,
            id_chambre: a.id_chambre,
            date_admission: a.date_admission,
            date_sortie: a.date_sortie,
            statut: a.statut,
            nom: a.beneficiaire?.nom || null,
            prenom: a.beneficiaire?.prenom || null
        }));

        res.json(result);
    } catch (err) {
        console.error('❌ Erreur GET admissions:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Une admission par ID
// ============================================
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('admission')
            .select(`
                *,
                beneficiaire (nom, prenom)
            `)
            .eq('id_admission', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ error: "Admission non trouvée" });
        }

        const result = {
            ...data,
            nom: data.beneficiaire?.nom || null,
            prenom: data.beneficiaire?.prenom || null,
            beneficiaire: undefined
        };

        res.json(result);
    } catch (err) {
        console.error('❌ Erreur GET admission:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Admissions d'un patient spécifique
// ============================================
router.get('/patient/:id', async (req, res) => {
    const patientId = req.params.id;
    
    if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: "ID patient invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('admission')
            .select('*')
            .eq('id_beneficiaire', patientId)
            .order('date_admission', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('❌ Erreur GET admissions patient:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Admissions actives
// ============================================
router.get('/actives', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('admission')
            .select(`
                *,
                beneficiaire (nom, prenom)
            `)
            .eq('statut', 'active')
            .order('date_admission', { ascending: false });

        if (error) throw error;

        const result = data.map(a => ({
            ...a,
            nom: a.beneficiaire?.nom || null,
            prenom: a.beneficiaire?.prenom || null,
            beneficiaire: undefined
        }));

        res.json(result);
    } catch (err) {
        console.error('❌ Erreur GET admissions actives:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// POST Ajouter une admission
// ============================================
router.post('/', async (req, res) => {
    const { id_beneficiaire, id_chambre, date_admission, date_sortie, statut } = req.body;

    if (!id_beneficiaire) {
        return res.status(400).json({ error: "Patient requis" });
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

        // Si id_chambre fourni, vérifier que la chambre existe
        if (id_chambre) {
            const { data: chambre, error: chambreError } = await supabase
                .from('chambre')
                .select('id_chambre')
                .eq('id_chambre', id_chambre)
                .maybeSingle();

            if (chambreError || !chambre) {
                return res.status(404).json({ error: "Chambre non trouvée" });
            }
        }

        const { data, error } = await supabase
            .from('admission')
            .insert([{
                id_beneficiaire,
                id_chambre: id_chambre || null,
                date_admission: date_admission || new Date().toISOString(),
                date_sortie: date_sortie || null,
                statut: statut || 'active'
            }])
            .select();

        if (error) throw error;

        res.status(201).json({
            success: true,
            id: data[0].id_admission,
            message: "Admission enregistrée avec succès"
        });
    } catch (err) {
        console.error('❌ Erreur POST admission:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PUT Modifier une admission
// ============================================
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { id_chambre, date_sortie, statut } = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const updates = {};
        if (id_chambre !== undefined) updates.id_chambre = id_chambre;
        if (date_sortie !== undefined) updates.date_sortie = date_sortie;
        if (statut !== undefined) updates.statut = statut;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "Aucune donnée à modifier" });
        }

        const { data, error } = await supabase
            .from('admission')
            .update(updates)
            .eq('id_admission', id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Admission non trouvée" });
        }

        res.json({
            success: true,
            message: "Admission modifiée avec succès",
            id: data[0].id_admission
        });
    } catch (err) {
        console.error('❌ Erreur PUT admission:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// DELETE Supprimer une admission
// ============================================
router.delete('/:id', async (req, res) => {
    const id = req.params.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('admission')
            .delete()
            .eq('id_admission', id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Admission non trouvée" });
        }

        res.json({
            success: true,
            message: "Admission supprimée avec succès",
            id: data[0].id_admission
        });
    } catch (err) {
        console.error('❌ Erreur DELETE admission:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
