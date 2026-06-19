const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// ============================================
// CONFIGURATION SUPABASE
// ============================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERREUR FATALE : Variables Supabase manquantes !');
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Route consultations.js chargée avec Supabase');

// ============================================
// GET Toutes les consultations
// ============================================
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('consultation')
            .select(`
                *,
                beneficiaire:beneficiaire!inner(
                    nom,
                    prenom
                )
            `)
            .order('date_heure', { ascending: false });

        if (error) {
            console.error('❌ Erreur GET consultations:', error);
            return res.status(500).json({ error: error.message });
        }

        res.json(data || []);
    } catch (err) {
        console.error('❌ Erreur:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Une consultation par ID
// ============================================
router.get('/details/:id', async (req, res) => {
    const id = req.params.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('consultation')
            .select(`
                *,
                beneficiaire:beneficiaire!inner(
                    nom,
                    prenom
                )
            `)
            .eq('id_consultation', id)
            .maybeSingle();

        if (error) {
            console.error('❌ Erreur GET consultation:', error);
            return res.status(500).json({ error: error.message });
        }

        if (!data) {
            return res.status(404).json({ error: "Consultation non trouvée" });
        }

        res.json(data);
    } catch (err) {
        console.error('❌ Erreur:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Consultations d'un médecin spécifique
// ============================================
router.get('/medecin/:id', async (req, res) => {
    const medecinId = req.params.id;

    if (!medecinId || isNaN(medecinId)) {
        return res.status(400).json({ error: "ID médecin invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('consultation')
            .select(`
                *,
                beneficiaire:beneficiaire!inner(
                    nom,
                    prenom
                )
            `)
            .eq('id_medecin', medecinId)
            .order('date_heure', { ascending: false })
            .limit(10);

        if (error) {
            console.error('❌ Erreur GET consultations médecin:', error);
            return res.status(500).json({ error: error.message });
        }

        res.json(data || []);
    } catch (err) {
        console.error('❌ Erreur:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Consultations d'un patient spécifique
// ============================================
router.get('/patient/:id', async (req, res) => {
    const patientId = req.params.id;

    if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: "ID patient invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('consultation')
            .select(`
                *,
                beneficiaire:beneficiaire!inner(
                    nom,
                    prenom
                )
            `)
            .eq('id_beneficiaire', patientId)
            .order('date_heure', { ascending: false });

        if (error) {
            console.error('❌ Erreur GET consultations patient:', error);
            return res.status(500).json({ error: error.message });
        }

        res.json(data || []);
    } catch (err) {
        console.error('❌ Erreur:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// POST Ajouter une consultation
// ============================================
router.post('/', async (req, res) => {
    const { id_beneficiaire, id_medecin, date_heure, motif, type, statut } = req.body;

    // Validation
    const errors = [];
    if (!id_beneficiaire) errors.push("ID patient requis");
    if (!id_medecin) errors.push("ID médecin requis");
    if (!date_heure) errors.push("Date et heure requises");

    if (errors.length > 0) {
        return res.status(400).json({ 
            error: "Champs manquants", 
            details: errors 
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

        // ✅ CORRECTION : Vérifier dans la table 'personnel' avec le poste 'medecin'
        const { data: medecin, error: medecinError } = await supabase
            .from('personnel') // 👈 On vérifie dans la table 'personnel'
            .select('id_personnel')
            .eq('id_personnel', id_medecin)
            .eq('poste', 'medecin') // 👈 On vérifie que c'est bien un médecin
            .maybeSingle();

        if (medecinError || !medecin) {
            return res.status(404).json({ error: "Médecin non trouvé" });
        }

        // Insertion
        const { data, error } = await supabase
            .from('consultation')
            .insert([{ 
                id_beneficiaire, 
                id_medecin, 
                date_heure, 
                motif: motif || '',
                type: type || 'presentiel', 
                statut: statut || 'planifiee'
            }])
            .select();

        if (error) {
            console.error('❌ Erreur insertion consultation:', error);
            return res.status(500).json({ error: error.message });
        }

        res.status(201).json({ 
            success: true, 
            id: data?.[0]?.id_consultation, 
            message: "Consultation ajoutée avec succès" 
        });

    } catch (err) {
        console.error('❌ Erreur POST consultation:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PUT Modifier une consultation
// ============================================
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { motif, type, statut, date_heure } = req.body;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const updates = {};
        if (motif !== undefined) updates.motif = motif;
        if (type !== undefined) updates.type = type;
        if (statut !== undefined) updates.statut = statut;
        if (date_heure !== undefined) updates.date_heure = date_heure;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "Aucune donnée à modifier" });
        }

        const { data, error } = await supabase
            .from('consultation')
            .update(updates)
            .eq('id_consultation', id)
            .select();

        if (error) {
            console.error('❌ Erreur UPDATE consultation:', error);
            return res.status(500).json({ error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Consultation non trouvée" });
        }

        res.json({ 
            success: true, 
            message: "Consultation modifiée avec succès",
            consultation: data[0]
        });

    } catch (err) {
        console.error('❌ Erreur PUT consultation:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// DELETE Supprimer une consultation
// ============================================
router.delete('/:id', async (req, res) => {
    const id = req.params.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('consultation')
            .delete()
            .eq('id_consultation', id)
            .select();

        if (error) {
            console.error('❌ Erreur DELETE consultation:', error);
            return res.status(500).json({ error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Consultation non trouvée" });
        }

        res.json({ 
            success: true, 
            message: "Consultation supprimée avec succès" 
        });

    } catch (err) {
        console.error('❌ Erreur DELETE consultation:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
