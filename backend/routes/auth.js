const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
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
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Route auth.js chargée avec succès (Supabase)');

const SECRET_KEY = process.env.JWT_SECRET || 'votre_secret_tres_long_et_securise_ici';

// ============================================
// ROUTE LOGIN (avec limit(1))
// ============================================
router.post('/login', async (req, res) => {
    const { username, password, role } = req.body;

    console.log('📝 Tentative login:', { username, role, passwordLength: password?.length || 0 });

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
        const cleanUsername = username.trim();
        console.log('🔍 Recherche utilisateur:', cleanUsername);

        // ✅ CORRECTION : avec limit(1) pour éviter de charger trop de données
        const { data: users, error } = await supabase
            .from('personnel')
            .select('*')
            .or(`email.eq.${cleanUsername},telephone.eq.${cleanUsername}`)
            .limit(1); // 🛡️ Sécurité supplémentaire

        if (error) {
            console.error('❌ Erreur Supabase:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        const user = (users && users.length > 0) ? users[0] : null;

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

        if (user.poste !== role) {
            console.log('❌ Rôle incorrect:', { attendu: role, trouvé: user.poste });
            return res.status(403).json({ 
                error: 'Rôle non autorisé',
                details: `Votre rôle est "${user.poste}", vous tentez de vous connecter en tant que "${role}"`
            });
        }

        if (!user.mot_de_passe || user.mot_de_passe !== password) {
            console.log('❌ Mot de passe incorrect');
            return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
        }

        console.log('✅ Mot de passe correct pour:', user.email);

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
        const cleanPhone = telephone.replace(/[\s\-\.\(\)]/g, '');
        console.log('🔍 Recherche téléphone:', cleanPhone);

        const { data: personnel, error: errP } = await supabase
            .from('personnel')
            .select('id_personnel, nom, prenom, poste')
            .eq('telephone', cleanPhone)
            .limit(1); // 🛡️ Sécurité

        if (personnel && personnel.length > 0) {
            const p = personnel[0];
            console.log('✅ Personnel trouvé:', p.nom);
            return res.json({ 
                found: true, 
                type: 'personnel', 
                role: p.poste,
                id: p.id_personnel,
                nom: p.nom,
                prenom: p.prenom
            });
        }

        const { data: benef, error: errB } = await supabase
            .from('beneficiaire')
            .select('id_beneficiaire, nom, prenom')
            .eq('telephone', cleanPhone)
            .limit(1);

        if (benef && benef.length > 0) {
            const b = benef[0];
            console.log('✅ Bénéficiaire trouvé:', b.nom);
            return res.json({ 
                found: true, 
                type: 'patient', 
                role: 'patient',
                id: b.id_beneficiaire,
                nom: b.nom,
                prenom: b.prenom
            });
        }

        console.log('❌ Aucun utilisateur trouvé');
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
// ROUTE SEED
// ============================================
router.get('/seed', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('personnel')
            .insert([
                { 
                    nom: 'Admin', 
                    prenom: 'System', 
                    email: 'admin@chat.com', 
                    telephone: '0600000000', 
                    poste: 'boss', 
                    mot_de_passe: 'admin123' 
                }
            ])
            .select();

        if (error) {
            console.error('❌ Erreur seed:', error);
            return res.status(500).json({ error: error.message });
        }

        res.json({ success: true, message: 'Utilisateur admin créé', data });
    } catch (err) {
        console.error('❌ Erreur seed:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
