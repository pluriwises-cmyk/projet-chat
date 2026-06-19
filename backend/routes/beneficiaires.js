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
// GET Tous les bénéficiaires (AJOUTÉ)
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
        console.error('❌ Erreur récupération bénéficiaires:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET Un bénéficiaire par ID (AJOUTÉ)
// ============================================
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }

    try {
        const { data, error } = await supabase
            .from('beneficiaire')
            .select('*')
            .eq('id_beneficiaire', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ error: "Bénéficiaire non trouvé" });
        }
        res.json(data);
    } catch (err) {
        console.error('❌ Erreur récupération bénéficiaire:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// FONCTION UTILITAIRE : Inscription d'un patient
// ============================================
async function inscrirePatient(nom, prenom, telephone, email, adresse) {
    const cleanPhone = telephone.replace(/[\s\-\.\(\)]/g, '');

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

    if (email) {
        const { data: existingEmail, error: emailError } = await supabase
            .from('beneficiaire')
            .select('id_beneficiaire')
            .eq('email', email)
            .maybeSingle();

        if (emailError) throw new Error(`Erreur vérification email: ${emailError.message}`);
        if (existingEmail) {
            const err = new Error("Cet email est déjà enregistré");
            err.code = 'DUPLICATE_EMAIL';
            throw err;
        }
    }

    const { data, error } = await supabase
        .from('beneficiaire')
        .insert([{ 
            nom, 
            prenom, 
            telephone: cleanPhone, 
            email: email || null, 
            adresse: adresse || null, 
            type: 'patient', 
            statut: 'actif' 
        }])
        .select();

    if (error) throw new Error(`Erreur insertion: ${error.message}`);
    return data[0];
}

// ============================================
// POST /inscription
// ============================================
router.post('/inscription', async (req, res) => {
    const { nom, prenom, telephone, email, adresse } = req.body;

    const errors = [];
    if (!nom) errors.push("Nom requis");
    if (!prenom) errors.push("Prénom requis");
    if (!telephone) errors.push("Téléphone requis");
    
    if (errors.length > 0) {
        return res.status(400).json({ 
            error: "Champs manquants", 
            details: errors 
        });
    }

    try {
        const newBenef = await inscrirePatient(nom, prenom, telephone, email, adresse);

        const token = jwt.sign(
            { 
                id: newBenef.id_beneficiaire, 
                telephone: newBenef.telephone, 
                role: 'patient', 
                type: 'patient' 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Inscription réussie',
            token: token,
            id: newBenef.id_beneficiaire,
            patient: {
                nom: newBenef.nom,
                prenom: newBenef.prenom,
                telephone: newBenef.telephone,
                email: newBenef.email
            }
        });

    } catch (err) {
        console.error('Erreur inscription:', err);
        
        if (err.code === 'DUPLICATE_PHONE') {
            return res.status(409).json({
                error: err.message,
                existing: err.existing
            });
        }
        
        if (err.code === 'DUPLICATE_EMAIL') {
            return res.status(409).json({
                error: err.message
            });
        }
        
        res.status(500).json({ 
            error: 'Erreur serveur', 
            details: err.message 
        });
    }
});

// ============================================
// POST / (Alias)
// ============================================
router.post('/', async (req, res) => {
    const { nom, prenom, telephone, email, adresse } = req.body;

    if (!nom || !prenom || !telephone) {
        return res.status(400).json({ error: 'Nom, prénom et téléphone requis' });
    }

    try {
        const newBenef = await inscrirePatient(nom, prenom, telephone, email, adresse);

        const token = jwt.sign(
            { 
                id: newBenef.id_beneficiaire, 
                telephone: newBenef.telephone, 
                role: 'patient', 
                type: 'patient' 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Patient ajouté avec succès',
            token: token,
            id: newBenef.id_beneficiaire
        });

    } catch (err) {
        console.error('Erreur POST / beneficiaire:', err);
        
        if (err.code === 'DUPLICATE_PHONE') {
            return res.status(409).json({
                error: err.message,
                existing: err.existing
            });
        }
        
        res.status(500).json({ error: 'Erreur serveur', details: err.message });
    }
});

module.exports = router;
