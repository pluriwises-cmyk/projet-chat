const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
//const bcrypt = require('bcrypt');
const db = require('../database/db');

const SECRET_KEY = process.env.JWT_SECRET || 'votre_secret_tres_long_et_securise_ici';

// Route de connexion
router.post('/login', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Identifiant, mot de passe et rôle requis' });
    }

    // Déterminer la table selon le rôle
    let table, idField, roleField;
    
    switch(role) {
        case 'medecin':
        case 'infirmier':
        case 'administratif':
        case 'hotellerie':
        case 'logistique':
        case 'qualite':
        case 'voyages':
            table = 'personnel';
            idField = 'id_personnel';
            roleField = 'poste';
            break;
        case 'direction':
            table = 'direction';
            idField = 'id_direction';
            roleField = 'poste';
            break;
        default:
            return res.status(400).json({ error: 'Rôle non reconnu' });
    }

    // Requête selon le rôle (adapté à ta structure)
    let sql = `SELECT * FROM ${table} WHERE email = ? OR telephone = ?`;
    
    db.get(sql, [username, username], async (err, user) => {
        if (err) {
            console.error('Erreur SQL:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
        }

        // Vérification du rôle
        if (user[roleField] !== role && role !== 'administratif') {
            return res.status(403).json({ error: 'Rôle non autorisé pour cet utilisateur' });
        }

        // Pour l'exemple, on compare le mot de passe en clair
        // Tu devras remplacer par bcrypt si tu as hashé les mots de passe
        if (user.mot_de_passe && user.mot_de_passe !== password) {
            return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
        }

        // Génération du token JWT
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

module.exports = router;
