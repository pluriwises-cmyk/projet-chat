const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
// SUPPRIMER : const db = require('../database/db'); 
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const JWT_SECRET = 'hopital_saint_jean_secret_key';

// 1. GÉNÉRER UN CODE
router.post('/request-code', async (req, res) => {
    const { telephone } = req.body;
    if (!telephone) return res.status(400).json({ error: 'Téléphone requis' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 2);

    try {
        // Suppression sécurisée des anciens codes
        await supabase.from('whatsapp_validation').delete().eq('telephone', telephone);

        // Insertion du nouveau
        const { error } = await supabase.from('whatsapp_validation').insert({
            telephone, code, statut: 'en_attente',
            date_expiration: expiration.toISOString(),
            date_envoi: new Date().toISOString(),
            tentative: 0
        });

        if (error) throw error;
        res.json({ success: true, message: 'Code envoyé', code_dev: code });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 2. VÉRIFIER UN CODE
router.post('/verify-code', async (req, res) => {
    const { telephone, code } = req.body;
    if (!telephone || !code) return res.status(400).json({ error: 'Données manquantes' });

    try {
        // Recherche du code valide
        const { data: validation, error: vErr } = await supabase
            .from('whatsapp_validation')
            .select('*')
            .eq('telephone', telephone)
            .eq('code', code)
            .eq('statut', 'en_attente')
            .gte('date_expiration', new Date().toISOString())
            .maybeSingle();

        if (vErr || !validation) return res.status(400).json({ error: 'Code invalide ou expiré' });

        // MISE À JOUR CORRECTE AVEC .eq() - PLUS D'ERREUR 21000
        await supabase
            .from('whatsapp_validation')
            .update({ statut: 'valide', date_validation: new Date().toISOString() })
            .eq('id_validation', validation.id_validation);

        // Vérification personnel
        const { data: personnel } = await supabase
            .from('personnel')
            .select('*')
            .eq('telephone', telephone)
            .maybeSingle();

        if (personnel) {
            // ... (logique JWT ici)
            return res.json({ success: true, user: personnel, role: personnel.poste });
        }

        // Vérification bénéficiaire
        const { data: beneficiaire } = await supabase
            .from('beneficiaire')
            .select('*')
            .or(`telephone.eq.${telephone},whatsapp.eq.${telephone}`)
            .maybeSingle();

        if (beneficiaire) {
            // ... (logique JWT patient)
            return res.json({ success: true, role: 'patient' });
        }

        return res.json({ success: true, message: 'Inscription requise' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
