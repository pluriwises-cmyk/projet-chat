const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database/db');
console.log('✅ Route auth.js chargée avec succès');
const SECRET_KEY = process.env.JWT_SECRET || 'votre_secret_tres_long_et_securise_ici';

// Route de connexion
router.post('/login', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Identifiant, mot de passe et rôle requis' });
    }

    let table, idField, roleField;
    
    switch(role) {
        case 'medecin':
        case 'infirmier':
        case 'administratif':
        case 'hotellerie':
        case 'logistique':
        case 'qualite':
        case 'voyages':
        case 'chauffeur':
        case 'direction':
        case 'boss':
            table = 'personnel';
            idField = 'id_personnel';
            roleField = 'poste';
            break;
        default:
            return res.status(400).json({ error: 'Rôle non reconnu' });
    }

    let sql = `SELECT * FROM ${table} WHERE email = ? OR telephone = ?`;
    
    db.get(sql, [username, username], async (err, user) => {
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

        if (!user.mot_de_passe || user.mot_de_passe !== password) {
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

// Supprime les routes /setup et /seed si elles ne sont plus nécessaires
// (ou garde-les pour la compatibilité)
module.exports = router;
