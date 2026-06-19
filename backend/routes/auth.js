const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js'); // 👈 IMPORTANT

// ============================================
// CONFIGURATION SUPABASE
// ============================================
const supabaseUrl = process.env.SUPABASE_URL || 'https://ton-projet.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'ta_clé_anon';
const supabase = createClient(supabaseUrl, supabaseKey);

// Si tu utilises un fichier de config centralisé :
// const supabase = require('../config/supabase');

console.log('✅ Route auth.js chargée avec succès (Supabase)');

const SECRET_KEY = process.env.JWT_SECRET || 'votre_secret_tres_long_et_securise_ici';

// ============================================
// ROUTE LOGIN (version Supabase)
// ============================================
router.post('/login', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Identifiant, mot de passe et rôle requis' });
    }

    const allowedRoles = [
        'medecin', 'infirmier', 'administratif', 
        'hotellerie', 'logistique', 'qualite', 'voyages',
        'chauffeur', 'direction', 'boss'
    ];

    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Rôle non reconnu' });
    }

    try {
        // Nettoyer l'identifiant (email ou téléphone)
        const cleanUsername = username.trim();

        // Chercher dans la table personnel
        const { data: user, error } = await supabase
            .from('personnel')
            .select('*')
            .or(`email.eq.${cleanUsername},telephone.eq.${cleanUsername}`)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
        }

        if (user.poste !== role) {
            return res.status(403).json({ error: 'Rôle non autorisé' });
        }

        // Vérification du mot de passe (si hashé, utiliser bcrypt)
        // Pour l'instant, on compare en clair (à améliorer plus tard)
        if (user.mot_de_passe !== password) {
            return res.status(401).json({ error: 'Mot de passe incorrect' });
        }

        const token = jwt.sign(
            { 
                id: user.id_personnel, 
                role: role,
                nom: user.nom,
                prenom: user.prenom,
                email: user.email
            }, 
            SECRET_KEY, 
            { expiresIn: '24h' }
        );

        res.json({ 
            token, 
            user: { 
                id: user.id_personnel, 
                nom: user.nom, 
                prenom: user.prenom, 
                role: role 
            } 
        });

    } catch (error) {
        console.error('Erreur login:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================
// ROUTE CHECK-PHONE (VERSION SUPABASE AMÉLIORÉE)
// ============================================
router.post('/check-phone', async (req, res) => {
    const { telephone } = req.body;

    if (!telephone) {
        return res.status(400).json({ error: 'Numéro de téléphone requis' });
    }

    try {
        // Nettoyer le numéro (enlever espaces, tirets, parenthèses, points)
        const cleanPhone = telephone.replace(/[\s\-\.\(\)]/g, '');

        // 1. Chercher dans PERSONNEL
        const { data: personnel, error: errP } = await supabase
            .from('personnel')
            .select('id_personnel, nom, prenom, poste')
            .eq('telephone', cleanPhone)
            .maybeSingle(); // 👈 .maybeSingle() = pas d'erreur si aucun résultat

        if (personnel) {
            return res.json({ 
                found: true, 
                type: 'personnel', 
                role: personnel.poste,
                id: personnel.id_personnel,
                nom: personnel.nom,
                prenom: personnel.prenom
            });
        }

        // 2. Chercher dans BENEFICIAIRE
        const { data: benef, error: errB } = await supabase
            .from('beneficiaire')
            .select('id_beneficiaire, nom, prenom')
            .eq('telephone', cleanPhone)
            .maybeSingle();

        if (benef) {
            return res.json({ 
                found: true, 
                type: 'patient', 
                role: 'patient',
                id: benef.id_beneficiaire,
                nom: benef.nom,
                prenom: benef.prenom
            });
        }

        // 3. Aucun utilisateur trouvé
        return res.json({ found: false });

    } catch (error) {
        console.error('Erreur check-phone:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================
// ROUTE VÉRIFICATION TOKEN
// ============================================
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        res.json({ valid: true, user: decoded });
    } catch (err) {
        res.status(401).json({ error: 'Token invalide ou expiré' });
    }
});

// ============================================
// ROUTES TEMPORAIRES
// ============================================
router.get('/setup', (req, res) => {
    res.json({ message: 'Setup route' });
});

router.get('/seed', (req, res) => {
    res.json({ message: 'Seed route' });
});

module.exports = router;
