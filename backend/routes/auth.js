const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// ============================================
// CONFIGURATION SUPABASE (avec vérification)
// ============================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// ✅ Vérification stricte des variables
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERREUR FATALE : Variables Supabase manquantes !');
    console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('   SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌');
    // Ne pas planter en production, mais logger l'erreur
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Route auth.js chargée avec succès (Supabase)');

const SECRET_KEY = process.env.JWT_SECRET || 'votre_secret_tres_long_et_securise_ici';
console.log('🔐 JWT_SECRET:', process.env.JWT_SECRET ? '✅ Configuré' : '⚠️ Fallback utilisé');

// ============================================
// ROUTE LOGIN (avec logs détaillés)
// ============================================
router.post('/login', async (req, res) => {
    const { username, password, role } = req.body;

    // ✅ Logs de débogage
    console.log('📝 Tentative de login:', { 
        username, 
        role, 
        passwordLength: password?.length || 0 
    });

    // Validation des champs
    if (!username || !password || !role) {
        console.log('❌ Champs manquants:', { username: !!username, password: !!password, role: !!role });
        return res.status(400).json({ 
            error: 'Identifiant, mot de passe et rôle requis',
            details: {
                username: !!username,
                password: !!password,
                role: !!role
            }
        });
    }

    // Liste des rôles autorisés
    const allowedRoles = [
        'medecin', 'infirmier', 'administratif', 
        'hotellerie', 'logistique', 'qualite', 'voyages',
        'chauffeur', 'direction', 'boss'
    ];

    if (!allowedRoles.includes(role)) {
        console.log('❌ Rôle non reconnu:', role);
        return res.status(400).json({ 
            error: 'Rôle non reconnu',
            allowedRoles: allowedRoles
        });
    }

    try {
        // Nettoyer l'identifiant
        const cleanUsername = username.trim();
        console.log('🔍 Recherche de l\'utilisateur:', cleanUsername);

        // Chercher dans la table personnel
        const { data: user, error } = await supabase
            .from('personnel')
            .select('*')
            .or(`email.eq.${cleanUsername},telephone.eq.${cleanUsername}`)
            .maybeSingle(); // ✅ Utilisation de maybeSingle() au lieu de single()

        if (error) {
            console.error('❌ Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (!user) {
            console.log('❌ Utilisateur non trouvé:', cleanUsername);
            return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
        }

        console.log('✅ Utilisateur trouvé:', { 
            id: user.id_personnel, 
            nom: user.nom, 
            prenom: user.prenom,
            poste: user.poste,
            email: user.email
        });

        // Vérification du rôle
        if (user.poste !== role) {
            console.log('❌ Rôle incorrect:', { attendu: role, trouvé: user.poste });
            return res.status(403).json({ 
                error: 'Rôle non autorisé',
                details: `Votre rôle est "${user.poste}", mais vous tentez de vous connecter en tant que "${role}"`
            });
        }

        // Vérification du mot de passe
        // ✅ Si le mot de passe est hashé (bcrypt), il faudra utiliser bcrypt.compare()
        // Pour l'instant, comparaison en clair
        if (user.mot_de_passe !== password) {
            console.log('❌ Mot de passe incorrect pour:', user.email);
            return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
        }

        console.log('✅ Mot de passe correct pour:', user.email);

        // Génération du token JWT
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

        console.log('✅ Token généré pour:', user.email);

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
        console.error('❌ Erreur login:', error);
        return res.status(500).json({ 
            error: 'Erreur serveur', 
            details: error.message 
        });
    }
});

// ============================================
// ROUTE CHECK-PHONE
// ============================================
router.post('/check-phone', async (req, res) => {
    const { telephone } = req.body;

    if (!telephone) {
        return res.status(400).json({ error: 'Numéro de téléphone requis' });
    }

    try {
        // Nettoyer le numéro
        const cleanPhone = telephone.replace(/[\s\-\.\(\)]/g, '');
        console.log('🔍 Recherche téléphone:', cleanPhone);

        // 1. Chercher dans PERSONNEL
        const { data: personnel, error: errP } = await supabase
            .from('personnel')
            .select('id_personnel, nom, prenom, poste')
            .eq('telephone', cleanPhone)
            .maybeSingle();

        if (personnel) {
            console.log('✅ Personnel trouvé:', personnel.nom);
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
            console.log('✅ Bénéficiaire trouvé:', benef.nom);
            return res.json({ 
                found: true, 
                type: 'patient', 
                role: 'patient',
                id: benef.id_beneficiaire,
                nom: benef.nom,
                prenom: benef.prenom
            });
        }

        console.log('❌ Aucun utilisateur trouvé pour:', cleanPhone);
        return res.json({ found: false });

    } catch (error) {
        console.error('❌ Erreur check-phone:', error);
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
