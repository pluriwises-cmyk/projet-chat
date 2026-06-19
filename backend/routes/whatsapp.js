const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'hopital_saint_jean_secret_key';

// ============================================
// 1. GÉNÉRER UN CODE
// ============================================
router.post('/request-code', async (req, res) => {
    const { telephone } = req.body;
    if (!telephone) {
        return res.status(400).json({ error: 'Téléphone requis' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 2);

    try {
        // Supprimer les anciens codes
        await supabase.from('whatsapp_validation').delete().eq('telephone', telephone);

        // Insérer le nouveau code
        const { error } = await supabase.from('whatsapp_validation').insert({
            telephone,
            code,
            statut: 'en_attente',
            date_expiration: expiration.toISOString(),
            date_envoi: new Date().toISOString(),
            tentative: 0
        });

        if (error) throw error;

        res.json({
            success: true,
            message: 'Code envoyé avec succès',
            code_dev: code
        });
    } catch (err) {
        console.error('❌ Erreur request-code:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================
// 2. VÉRIFIER UN CODE
// ============================================
router.post('/verify-code', async (req, res) => {
    const { telephone, code } = req.body;
    if (!telephone || !code) {
        return res.status(400).json({ error: 'Téléphone et code requis' });
    }

    try {
        // Recherche du code
        const { data: validation, error: vErr } = await supabase
            .from('whatsapp_validation')
            .select('*')
            .eq('telephone', telephone)
            .eq('code', code)
            .eq('statut', 'en_attente')
            .gte('date_expiration', new Date().toISOString())
            .maybeSingle();

        if (vErr || !validation) {
            return res.status(400).json({ error: 'Code invalide ou expiré' });
        }

        // Mettre à jour le statut
        await supabase
            .from('whatsapp_validation')
            .update({
                statut: 'valide',
                date_validation: new Date().toISOString()
            })
            .eq('id_validation', validation.id_validation);

        // Vérifier si c'est un personnel
        const { data: personnel } = await supabase
            .from('personnel')
            .select('*')
            .eq('telephone', telephone)
            .maybeSingle();

        if (personnel) {
            const token = jwt.sign(
                {
                    id: personnel.id_personnel,
                    nom: personnel.nom,
                    prenom: personnel.prenom,
                    role: personnel.poste,
                    email: personnel.email
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.json({
                success: true,
                token,
                user: personnel,
                role: personnel.poste
            });
        }

        // Vérifier si c'est un bénéficiaire
        const { data: beneficiaire } = await supabase
            .from('beneficiaire')
            .select('*')
            .or(`telephone.eq.${telephone},whatsapp.eq.${telephone}`)
            .maybeSingle();

        if (beneficiaire) {
            const token = jwt.sign(
                {
                    id: beneficiaire.id_beneficiaire,
                    nom: beneficiaire.nom,
                    prenom: beneficiaire.prenom,
                    role: 'patient',
                    type: 'patient'
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.json({
                success: true,
                token,
                user: beneficiaire,
                role: 'patient'
            });
        }

        // Aucun utilisateur trouvé, inscription requise
        return res.json({
            success: true,
            message: 'Inscription requise',
            require_inscription: true,
            telephone: telephone
        });

    } catch (err) {
        console.error('❌ Erreur verify-code:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
