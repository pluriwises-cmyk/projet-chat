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
    console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('   SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Route prescriptions.js chargée avec Supabase');

// ============================================
// GET Toutes les prescriptions
// ============================================
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('prescription')
            .select(`
                *,
                beneficiaire:beneficiaire!inner(
                    nom,
                    prenom
                ),
                medecin:personnel!inner(
                    nom,
                    prenom
                )
            `)
            .order('date_prescription', { ascending: false });

        if (error) {
            console.error('❌ Erreur GET prescriptions:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json(data || []);
    } catch (err) {
        console.error('❌ Erreur GET prescriptions:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Prescriptions d'un médecin spécifique
// ============================================
router.get('/medecin/:id', async (req, res) => {
    const medecinId = req.params.id;

    if (!medecinId || isNaN(medecinId)) {
        return res.status(400).json({ error: "ID médecin invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('prescription')
            .select(`
                *,
                beneficiaire:beneficiaire!inner(
                    nom,
                    prenom
                )
            `)
            .eq('id_medecin', medecinId)
            .order('date_prescription', { ascending: false });

        if (error) {
            console.error('❌ Erreur GET prescriptions médecin:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json(data || []);
    } catch (err) {
        console.error('❌ Erreur GET prescriptions médecin:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Prescriptions d'un patient spécifique
// ============================================
router.get('/patient/:id', async (req, res) => {
    const patientId = req.params.id;

    if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: "ID patient invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('prescription')
            .select(`
                *,
                medecin:personnel!inner(
                    nom,
                    prenom
                )
            `)
            .eq('id_beneficiaire', patientId)
            .order('date_prescription', { ascending: false });

        if (error) {
            console.error('❌ Erreur GET prescriptions patient:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json(data || []);
    } catch (err) {
        console.error('❌ Erreur GET prescriptions patient:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Une prescription par ID
// ============================================
router.get('/:id', async (req, res) => {
    const id = req.params.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('prescription')
            .select(`
                *,
                beneficiaire:beneficiaire!inner(
                    nom,
                    prenom
                ),
                medecin:personnel!inner(
                    nom,
                    prenom
                )
            `)
            .eq('id_prescription', id)
            .maybeSingle();

        if (error) {
            console.error('❌ Erreur GET prescription:', error);
            return res.status(500).json({ error: error.message });
        }

        if (!data) {
            return res.status(404).json({ error: "Prescription non trouvée" });
        }

        res.json(data);
    } catch (err) {
        console.error('❌ Erreur GET prescription:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Prescriptions du jour
// ============================================
router.get('/aujourdhui', async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const startOfDayISO = startOfDay.toISOString();

        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        const endOfDayISO = endOfDay.toISOString();

        const { data, error } = await supabase
            .from('prescription')
            .select(`
                *,
                beneficiaire:beneficiaire!inner(
                    nom,
                    prenom
                ),
                medecin:personnel!inner(
                    nom,
                    prenom
                )
            `)
            .gte('date_prescription', startOfDayISO)
            .lt('date_prescription', endOfDayISO)
            .order('date_prescription', { ascending: false });

        if (error) {
            console.error('❌ Erreur GET prescriptions aujourd\'hui:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json(data || []);
    } catch (err) {
        console.error('❌ Erreur GET prescriptions aujourd\'hui:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// POST Ajouter une prescription
// ============================================
router.post('/', async (req, res) => {
    const { id_beneficiaire, id_medecin, medicament, posologie, duree, instructions, statut } = req.body;

    // Validation des champs requis
    const errors = [];
    if (!id_beneficiaire) errors.push("ID patient requis");
    if (!id_medecin) errors.push("ID médecin requis");
    if (!medicament) errors.push("Médicament requis");

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
            .select('id_beneficiaire, nom, prenom')
            .eq('id_beneficiaire', id_beneficiaire)
            .maybeSingle();

        if (patientError || !patient) {
            return res.status(404).json({ error: "Patient non trouvé" });
        }

        // Vérifier que le médecin existe
        const { data: medecin, error: medecinError } = await supabase
            .from('personnel')
            .select('id_personnel, nom, prenom')
            .eq('id_personnel', id_medecin)
            .eq('poste', 'medecin')
            .maybeSingle();

        if (medecinError || !medecin) {
            return res.status(404).json({ error: "Médecin non trouvé" });
        }

        // Vérifier que le patient n'a pas déjà une prescription active pour le même médicament
        const { data: existing, error: checkError } = await supabase
            .from('prescription')
            .select('id_prescription')
            .eq('id_beneficiaire', id_beneficiaire)
            .eq('medicament', medicament)
            .eq('statut', 'en_cours')
            .maybeSingle();

        if (checkError) {
            console.error('❌ Erreur vérification prescription existante:', checkError);
        }

        if (existing) {
            return res.status(409).json({
                error: "Ce patient a déjà une prescription active pour ce médicament",
                existing_id: existing.id_prescription
            });
        }

        // Insertion
        const { data, error } = await supabase
            .from('prescription')
            .insert([{
                id_beneficiaire,
                id_medecin,
                medicament: medicament,
                posologie: posologie || '',
                duree: duree || '',
                instructions: instructions || '',
                statut: statut || 'en_cours',
                date_prescription: new Date().toISOString()
            }])
            .select();

        if (error) {
            console.error('❌ Erreur insertion prescription:', error);
            return res.status(500).json({ error: error.message });
        }

        res.status(201).json({
            success: true,
            id: data[0].id_prescription,
            message: "Prescription ajoutée avec succès",
            prescription: {
                id: data[0].id_prescription,
                patient: {
                    id: patient.id_beneficiaire,
                    nom: patient.nom,
                    prenom: patient.prenom
                },
                medicament: medicament,
                posologie: posologie || '',
                duree: duree || '',
                instructions: instructions || '',
                statut: statut || 'en_cours'
            }
        });

    } catch (err) {
        console.error('❌ Erreur POST prescription:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PUT Modifier une prescription
// ============================================
router.put('/:id', async (req, res) => {
    const id = req.params.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    const { medicament, posologie, duree, instructions, statut } = req.body;

    try {
        // Vérifier que la prescription existe
        const { data: existing, error: findError } = await supabase
            .from('prescription')
            .select('id_prescription')
            .eq('id_prescription', id)
            .maybeSingle();

        if (findError || !existing) {
            return res.status(404).json({ error: "Prescription non trouvée" });
        }

        // Construire les mises à jour
        const updates = {};
        if (medicament !== undefined) updates.medicament = medicament;
        if (posologie !== undefined) updates.posologie = posologie;
        if (duree !== undefined) updates.duree = duree;
        if (instructions !== undefined) updates.instructions = instructions;
        if (statut !== undefined) updates.statut = statut;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "Aucune donnée à modifier" });
        }

        const { data, error } = await supabase
            .from('prescription')
            .update(updates)
            .eq('id_prescription', id)
            .select();

        if (error) {
            console.error('❌ Erreur UPDATE prescription:', error);
            return res.status(500).json({ error: error.message });
        }

        res.json({
            success: true,
            message: "Prescription modifiée avec succès",
            prescription: data[0]
        });

    } catch (err) {
        console.error('❌ Erreur PUT prescription:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PATCH Changer le statut d'une prescription
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

    const allowedStatuts = ['en_cours', 'terminee', 'annulee'];
    if (!allowedStatuts.includes(statut)) {
        return res.status(400).json({
            error: "Statut invalide",
            allowed: allowedStatuts
        });
    }

    try {
        const { data, error } = await supabase
            .from('prescription')
            .update({ statut })
            .eq('id_prescription', id)
            .select();

        if (error) {
            console.error('❌ Erreur PATCH statut prescription:', error);
            return res.status(500).json({ error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Prescription non trouvée" });
        }

        res.json({
            success: true,
            message: "Statut mis à jour avec succès",
            prescription: data[0]
        });

    } catch (err) {
        console.error('❌ Erreur PATCH statut prescription:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// DELETE Supprimer une prescription
// ============================================
router.delete('/:id', async (req, res) => {
    const id = req.params.id;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        // Vérifier que la prescription existe
        const { data: existing, error: findError } = await supabase
            .from('prescription')
            .select('id_prescription, statut')
            .eq('id_prescription', id)
            .maybeSingle();

        if (findError || !existing) {
            return res.status(404).json({ error: "Prescription non trouvée" });
        }

        // Empêcher la suppression si la prescription est en cours
        if (existing.statut === 'en_cours') {
            return res.status(409).json({
                error: "Impossible de supprimer une prescription en cours",
                suggestion: "Changez le statut à 'terminee' ou 'annulee' d'abord"
            });
        }

        const { data, error } = await supabase
            .from('prescription')
            .delete()
            .eq('id_prescription', id)
            .select();

        if (error) {
            console.error('❌ Erreur DELETE prescription:', error);
            return res.status(500).json({ error: error.message });
        }

        res.json({
            success: true,
            message: "Prescription supprimée avec succès",
            id: data[0].id_prescription
        });

    } catch (err) {
        console.error('❌ Erreur DELETE prescription:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
