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

console.log('✅ Route courses.js chargée avec Supabase');

// ============================================
// GET Toutes les courses
// ============================================
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('course')
            .select(`
                *,
                vehicule!left(immatriculation),
                personnel!left(nom, prenom),
                beneficiaire!left(nom, prenom)
            `)
            .order('date_depart', { ascending: false });

        if (error) throw error;

        // Transformation pour garder la structure attendue par le front
        const result = data.map(c => ({
            id_course: c.id_course,
            id_vehicule: c.id_vehicule,
            id_chauffeur: c.id_chauffeur,
            id_beneficiaire: c.id_beneficiaire,
            date_depart: c.date_depart,
            lieu_depart: c.lieu_depart,
            destination: c.destination,
            type: c.type,
            statut: c.statut,
            immatriculation: c.vehicule?.immatriculation || null,
            chauffeur_nom: c.personnel?.nom || null,
            chauffeur_prenom: c.personnel?.prenom || null,
            patient_nom: c.beneficiaire?.nom || null,
            patient_prenom: c.beneficiaire?.prenom || null
        }));

        res.json(result);
    } catch (err) {
        console.error('❌ Erreur GET courses:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Courses d'un chauffeur spécifique
// ============================================
router.get('/chauffeur/:id', async (req, res) => {
    const chauffeurId = req.params.id;

    if (!chauffeurId || isNaN(chauffeurId)) {
        return res.status(400).json({ error: "ID chauffeur invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('course')
            .select(`
                *,
                vehicule!left(immatriculation),
                beneficiaire!left(nom, prenom)
            `)
            .eq('id_chauffeur', chauffeurId)
            .order('date_depart', { ascending: true });

        if (error) throw error;

        const result = data.map(c => ({
            id_course: c.id_course,
            id_vehicule: c.id_vehicule,
            id_chauffeur: c.id_chauffeur,
            id_beneficiaire: c.id_beneficiaire,
            date_depart: c.date_depart,
            lieu_depart: c.lieu_depart,
            destination: c.destination,
            type: c.type,
            statut: c.statut,
            immatriculation: c.vehicule?.immatriculation || null,
            patient_nom: c.beneficiaire?.nom || null,
            patient_prenom: c.beneficiaire?.prenom || null
        }));

        res.json(result);
    } catch (err) {
        console.error('❌ Erreur GET courses chauffeur:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// POST Ajouter une course
// ============================================
router.post('/', async (req, res) => {
    const { id_vehicule, id_chauffeur, id_beneficiaire, date_depart, lieu_depart, destination, type } = req.body;

    if (!id_chauffeur || !date_depart || !lieu_depart || !destination) {
        return res.status(400).json({ 
            error: "Chauffeur, date, lieu départ et destination sont requis" 
        });
    }

    try {
        const { data, error } = await supabase
            .from('course')
            .insert([{
                id_vehicule: id_vehicule || null,
                id_chauffeur: id_chauffeur,
                id_beneficiaire: id_beneficiaire || null,
                date_depart: date_depart,
                lieu_depart: lieu_depart,
                destination: destination,
                type: type || 'sanitaire',
                statut: 'planifiee'
            }])
            .select();

        if (error) throw error;

        res.status(201).json({
            success: true,
            id: data[0].id_course,
            message: "Course planifiée avec succès"
        });
    } catch (err) {
        console.error('❌ Erreur insertion course:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PUT Modifier une course
// ============================================
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { id_vehicule, id_chauffeur, id_beneficiaire, date_depart, lieu_depart, destination, type, statut } = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const updates = {};
        if (id_vehicule !== undefined) updates.id_vehicule = id_vehicule;
        if (id_chauffeur !== undefined) updates.id_chauffeur = id_chauffeur;
        if (id_beneficiaire !== undefined) updates.id_beneficiaire = id_beneficiaire;
        if (date_depart !== undefined) updates.date_depart = date_depart;
        if (lieu_depart !== undefined) updates.lieu_depart = lieu_depart;
        if (destination !== undefined) updates.destination = destination;
        if (type !== undefined) updates.type = type;
        if (statut !== undefined) updates.statut = statut;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "Aucune donnée à modifier" });
        }

        const { data, error } = await supabase
            .from('course')
            .update(updates)
            .eq('id_course', id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Course non trouvée" });
        }

        res.json({
            success: true,
            message: "Course modifiée avec succès",
            id: data[0].id_course
        });
    } catch (err) {
        console.error('❌ Erreur UPDATE course:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PATCH Changer le statut d'une course
// ============================================
router.patch('/:id/statut', async (req, res) => {
    const id = req.params.id;
    const { statut } = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    if (!statut) {
        return res.status(400).json({ error: "Statut requis" });
    }

    const allowedStatuts = ['planifiee', 'en_cours', 'terminee', 'annulee'];
    if (!allowedStatuts.includes(statut)) {
        return res.status(400).json({
            error: "Statut invalide",
            allowed: allowedStatuts
        });
    }

    try {
        const { data, error } = await supabase
            .from('course')
            .update({ statut })
            .eq('id_course', id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Course non trouvée" });
        }

        res.json({
            success: true,
            message: "Statut mis à jour",
            id: data[0].id_course
        });
    } catch (err) {
        console.error('❌ Erreur PATCH statut course:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// DELETE Supprimer une course
// ============================================
router.delete('/:id', async (req, res) => {
    const id = req.params.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('course')
            .delete()
            .eq('id_course', id)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Course non trouvée" });
        }

        res.json({
            success: true,
            message: "Course supprimée avec succès",
            id: data[0].id_course
        });
    } catch (err) {
        console.error('❌ Erreur DELETE course:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
