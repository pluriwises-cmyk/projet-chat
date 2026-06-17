const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database/db');

console.log('✅ Route auth.js chargée avec succès');
const SECRET_KEY = process.env.JWT_SECRET || 'votre_secret_tres_long_et_securise_ici';

// Route de connexion
router.post('/login', (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Identifiant, mot de passe et rôle requis' });
    }

    // ✅ TOUS les rôles utilisent la table personnel
    const table = 'personnel';
    const idField = 'id_personnel';
    const roleField = 'poste';

    // Liste des rôles autorisés
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

// Routes temporaires (si encore utilisées)
router.get('/setup', (req, res) => {
    // Tu peux garder cette route si elle est encore utilisée
    res.json({ message: 'Setup route' });
});

router.get('/seed', (req, res) => {
    // Tu peux garder cette route si elle est encore utilisée
    res.json({ message: 'Seed route' });
});
// AJOUTE CE CODE DANS TON FICHIER auth.js
router.post('/check-phone', (req, res) => {
    const { telephone } = req.body;

    if (!telephone) {
        return res.status(400).json({ error: 'Numéro de téléphone requis' });
    }

    // 1. On cherche d'abord dans le PERSONNEL
    const sqlPersonnel = "SELECT id_personnel, poste FROM personnel WHERE telephone = ?";
    
    db.get(sqlPersonnel, [telephone], (err, user) => {
        if (err) return res.status(500).json({ error: 'Erreur serveur' });

        if (user) {
            // C'est un personnel, on renvoie son rôle
            return res.json({ found: true, type: 'personnel', role: user.poste });
        } 
        
        // 2. Si pas trouvé, on cherche dans la table BENEFICIAIRE
        // Utilisation de ta table correcte : "beneficiaire"
        const sqlBeneficiaire = "SELECT id_beneficiaire FROM beneficiaire WHERE telephone = ?";
        
        db.get(sqlBeneficiaire, [telephone], (err, benef) => {
            if (err) return res.status(500).json({ error: 'Erreur serveur' });
            
            if (benef) {
                // C'est un bénéficiaire (patient/touriste...)
                return res.json({ found: true, type: 'patient' });
            } else {
                // Inconnu au bataillon
                return res.json({ found: false });
            }
        });
    });
});
router.post('/check-phone', (req, res) => {
    const { telephone } = req.body;

    if (!telephone) return res.status(400).json({ error: 'Numéro requis' });

    // 1. Chercher dans PERSONNEL (avec la colonne 'poste')
    const sqlPersonnel = "SELECT poste FROM personnel WHERE telephone = ?";
    
    db.get(sqlPersonnel, [telephone], (err, user) => {
        if (err) return res.status(500).json({ error: 'Erreur serveur' });

        if (user) {
            // Le serveur renvoie le rôle EXACT trouvé dans la colonne 'poste'
            return res.json({ found: true, type: 'personnel', role: user.poste });
        } 
        
        // 2. Chercher dans BENEFICIAIRE
        const sqlBeneficiaire = "SELECT id_beneficiaire FROM beneficiaire WHERE telephone = ?";
        db.get(sqlBeneficiaire, [telephone], (err, benef) => {
            if (err) return res.status(500).json({ error: 'Erreur serveur' });
            
            if (benef) {
                return res.json({ found: true, type: 'patient' });
            } else {
                return res.json({ found: false });
            }
        });
    });
});

module.exports = router;
