const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_ANON_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'hopital_saint_jean_secret_key';

// ============================================
// FONCTION UTILITAIRE : Inscription d'un patient
// ============================================
async function inscrirePatient(nom, prenom, telephone, email, adresse) {
    const cleanPhone = telephone.replace(/[\s\-\.\(\)]/g, '');

    // 1. Vérification doublon téléphone
    const { data: existing, error: checkError } = await supabase
        .from('beneficiaire')
        .select('id_beneficiaire, nom, prenom')
        .eq('telephone', cleanPhone)
        .maybeSingle();

    if (checkError) throw new Error(`Erreur vérification: ${checkError.message}`);
    if (existing) {
        const err = new Error("Ce numéro de téléphone est déjà enregistré");
        err.code = 'DUPLICATE_PHONE';
        err.existing = existing;
        throw err;
    }

    // 2. Insertion sans forcer l'ID (Laisse Supabase générer l'ID automatiquement)
    const { data, error } = await supabase
        .from('beneficiaire')
        .insert([{ 
            nom: nom,
            prenom: prenom,
            telephone: cleanPhone,
            email: email || null,
            adresse: adresse || 'Algérie', // Utilisation de la valeur par défaut pour éviter les NULL
            type: 'patient',
            statut: 'actif'
        }])
        .select();

    if (error) throw new Error(`Erreur insertion: ${error.message}`);
    return data[0];
}

// ============================================
// GET Tous les bénéficiaires
// ============================================
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('beneficiaire')
            .select('*')
            .order('nom', { ascending: true });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// POST /inscription
// ============================================
router.post('/inscription', async (req, res) => {
    const { nom, prenom, telephone, email, adresse } = req.body;

    if (!nom || !prenom || !telephone) {
        return res.status(400).json({ error: "Nom, prénom et téléphone requis" });
    }

    try {
        const newBenef = await inscrirePatient(nom, prenom, telephone, email, adresse);

        const token = jwt.sign(
            { id: newBenef.id_beneficiaire, role: 'patient' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ success: true, token, id: newBenef.id_beneficiaire });
    } catch (err) {
        if (err.code === 'DUPLICATE_PHONE') {
            return res.status(409).json({ error: err.message, existing: err.existing });
        }
        res.status(500).json({ error: 'Erreur serveur', details: err.message });
    }
});

module.exports = router;
