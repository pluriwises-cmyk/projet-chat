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

console.log('✅ Route spécialistes.js chargée avec Supabase');

// ============================================
// GET Tous les spécialistes avec leurs infos personnel
// ============================================
router.get('/', async (req, res) => {
    try {
        // ✅ Jointure avec la table personnel pour récupérer nom, prénom, téléphone, email
        const { data, error } = await supabase
            .from('specialiste')
            .select(`
                *,
                personnel!specialiste_id_personnel_fkey (
                    nom,
                    prenom,
                    telephone,
                    email
                )
            `)
            .order('id_specialiste', { ascending: true });

        if (error) {
            console.error('❌ Erreur GET spécialistes:', error);
            return res.status(500).json({ error: error.message });
        }

        // ✅ Transformation pour garder la structure attendue par le front
        const result = data.map(s => ({
            id_specialiste: s.id_specialiste,
            id_personnel: s.id_personnel,
            nom: s.personnel?.nom || 'Inconnu',
            prenom: s.personnel?.prenom || '',
            telephone: s.personnel?.telephone || 'Non renseigné',
            email: s.personnel?.email || 'Non renseigné',
            specialite: s.specialite || 'Non renseigné',
            photo_url: s.photo_url || 'default-doctor.png',
            cv_url: s.cv_url || null,
            description: s.description || ''
        }));

        res.json(result);
    } catch (err) {
        console.error('❌ Erreur GET spécialistes:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Un spécialiste par ID
// ============================================
router.get('/:id', async (req, res) => {
    const id = req.params.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('specialiste')
            .select(`
                *,
                personnel!specialiste_id_personnel_fkey (
                    nom,
                    prenom,
                    telephone,
                    email
                )
            `)
            .eq('id_specialiste', id)
            .maybeSingle();

        if (error) {
            console.error('❌ Erreur GET spécialiste:', error);
            return res.status(500).json({ error: error.message });
        }

        if (!data) {
            return res.status(404).json({ error: "Spécialiste non trouvé" });
        }

        const result = {
            id_specialiste: data.id_specialiste,
            id_personnel: data.id_personnel,
            nom: data.personnel?.nom || 'Inconnu',
            prenom: data.personnel?.prenom || '',
            telephone: data.personnel?.telephone || 'Non renseigné',
            email: data.personnel?.email || 'Non renseigné',
            specialite: data.specialite || 'Non renseigné',
            photo_url: data.photo_url || 'default-doctor.png',
            cv_url: data.cv_url || null,
            description: data.description || ''
        };

        res.json(result);
    } catch (err) {
        console.error('❌ Erreur GET spécialiste:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// POST Ajouter un spécialiste
// ============================================
router.post('/', async (req, res) => {
    const { id_personnel, specialite, photo_url, cv_url, description } = req.body;

    if (!id_personnel || !specialite) {
        return res.status(400).json({ error: "ID personnel et spécialité requis" });
    }

    try {
        // Vérifier que le personnel existe
        const { data: personnel, error: personnelError } = await supabase
            .from('personnel')
            .select('id_personnel')
            .eq('id_personnel', id_personnel)
            .maybeSingle();

        if (personnelError || !personnel) {
            return res.status(404).json({ error: "Personnel non trouvé" });
        }

        const { data, error } = await supabase
            .from('specialiste')
            .insert([{
                id_personnel,
                specialite,
                photo_url: photo_url || null,
                cv_url: cv_url || null,
                description: description || ''
            }])
            .select();

        if (error) {
            console.error('❌ Erreur POST spécialiste:', error);
            return res.status(500).json({ error: error.message });
        }

        res.status(201).json({
            success: true,
            id: data[0].id_specialiste,
            message: "Spécialiste ajouté avec succès"
        });
    } catch (err) {
        console.error('❌ Erreur POST spécialiste:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PUT Modifier un spécialiste
// ============================================
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { specialite, photo_url, cv_url, description } = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const updates = {};
        if (specialite !== undefined) updates.specialite = specialite;
        if (photo_url !== undefined) updates.photo_url = photo_url;
        if (cv_url !== undefined) updates.cv_url = cv_url;
        if (description !== undefined) updates.description = description;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "Aucune donnée à modifier" });
        }

        const { data, error } = await supabase
            .from('specialiste')
            .update(updates)
            .eq('id_specialiste', id)
            .select();

        if (error) {
            console.error('❌ Erreur PUT spécialiste:', error);
            return res.status(500).json({ error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Spécialiste non trouvé" });
        }

        res.json({
            success: true,
            message: "Spécialiste modifié avec succès",
            id: data[0].id_specialiste
        });
    } catch (err) {
        console.error('❌ Erreur PUT spécialiste:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// DELETE Supprimer un spécialiste
// ============================================
router.delete('/:id', async (req, res) => {
    const id = req.params.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('specialiste')
            .delete()
            .eq('id_specialiste', id)
            .select();

        if (error) {
            console.error('❌ Erreur DELETE spécialiste:', error);
            return res.status(500).json({ error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Spécialiste non trouvé" });
        }

        res.json({
            success: true,
            message: "Spécialiste supprimé avec succès",
            id: data[0].id_specialiste
        });
    } catch (err) {
        console.error('❌ Erreur DELETE spécialiste:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
