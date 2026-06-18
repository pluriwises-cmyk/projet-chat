const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database/db');

console.log('✅ Route auth.js chargée avec succès');
const SECRET_KEY = process.env.JWT_SECRET || 'votre_secret_tres_long_et_securise_ici';

// ==================== ROUTE LOGIN ====================
router.post('/login', (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Identifiant, mot de passe et rôle requis' });
    }

    const table = 'personnel';
    const idField = 'id_personnel';
    const roleField = 'poste';

    const allowedRoles = [
        'medecin', 'infirmier', 'administratif', 
        'hotellerie', 'logistique', 'qualite', 'voyages',
        'chauffeur', 'direction', 'boss'
    ];

    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Rôle non reconnu' });
    }

    const sql = `SELECT * FROM ${table} WHERE email = ? OR telephone = ?`;
    
    db.get(sql, [username, username], (err, user) => {
        if (err) {
            console.error('Erreur SQL:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
        }

        if (user[roleField] !== role) {
            return res.status(403).json({ error: 'Rôle non autorisé' });
        }

        if (user.mot_de_passe !== password) {
            return res.status(401).json({ error: 'Mot de passe incorrect' });
        }

        const token = jwt.sign(
            { 
                id: user[idField], 
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
                id: user[idField], 
                nom: user.nom, 
                prenom: user.prenom, 
                role: role 
            } 
        });
    });
});

// ==================== ROUTE CHECK-PHONE (FUSIONNÉE) ====================
router.post('/check-phone', (req, res) => {
    const { telephone } = req.body;

    if (!telephone) {
        return res.status(400).json({ error: 'Numéro de téléphone requis' });
    }

    // 1. Chercher dans PERSONNEL (avec id, nom, prenom, poste)
    const sqlPersonnel = "SELECT id_personnel, nom, prenom, poste FROM personnel WHERE telephone = ?";
    
    db.get(sqlPersonnel, [telephone], (err, user) => {
        if (err) {
            console.error('Erreur SQL personnel:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (user) {
            return res.json({ 
                found: true, 
                type: 'personnel', 
                role: user.poste,
                id: user.id_personnel,
                nom: user.nom,
                prenom: user.prenom
            });
        } 
        
        // 2. Chercher dans BENEFICIAIRE
        const sqlBeneficiaire = "SELECT id_beneficiaire, nom, prenom FROM beneficiaire WHERE telephone = ?";
        db.get(sqlBeneficiaire, [telephone], (err, benef) => {
            if (err) {
                console.error('Erreur SQL beneficiaire:', err);
                return res.status(500).json({ error: 'Erreur serveur' });
            }
            
            if (benef) {
                return res.json({ 
                    found: true, 
                    type: 'patient', 
                    role: 'patient',
                    id: benef.id_beneficiaire,
                    nom: benef.nom,
                    prenom: benef.prenom
                });
            } else {
                return res.json({ found: false });
            }
        });
    });
});

// ==================== ROUTES TEMPORAIRES (si encore utilisées) ====================
router.get('/setup', (req, res) => {
    res.json({ message: 'Setup route' });
});

router.get('/seed', (req, res) => {
    res.json({ message: 'Seed route' });
});

module.exports = router;
