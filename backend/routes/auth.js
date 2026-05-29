const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
//const bcrypt = require('bcrypt');
const db = require('../database/db');
console.log('✅ Route auth.js chargée avec succès');
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
// ROUTE TEMPORAIRE POUR AJOUTER LA COLONNE mot_de_passe
router.get('/setup', (req, res) => {
    // 1. Ajouter la colonne mot_de_passe
    const addColumnSQL = `ALTER TABLE personnel ADD COLUMN mot_de_passe TEXT;`;
    
    db.run(addColumnSQL, (err) => {
        // Si l'erreur n'est pas "duplicate column name", on continue
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Erreur ajout colonne:', err.message);
            // On continue quand même, la colonne existe peut-être déjà
        }
        
        // 2. Ajouter l'utilisateur admin
        const insertAdmin = `INSERT OR REPLACE INTO personnel (id_personnel, nom, prenom, poste, email, telephone, mot_de_passe, statut) 
                             VALUES (1, 'Admin', 'Principal', 'administratif', 'admin@chat.com', '0612345620', 'admin123', 'actif')`;
        
        db.run(insertAdmin, (err2) => {
            if (err2) {
                console.error('Erreur insertion admin:', err2.message);
                return res.status(500).json({ error: err2.message });
            }
            
            // 3. Vérifier que la colonne existe maintenant
            const checkColumn = `PRAGMA table_info(personnel)`;
            db.all(checkColumn, (err3, columns) => {
                if (err3) {
                    return res.status(500).json({ error: err3.message });
                }
                const hasPasswordColumn = columns.some(col => col.name === 'mot_de_passe');
                res.json({ 
                    message: hasPasswordColumn ? '✅ Base prête, colonne mot_de_passe existe' : '⚠️ Colonne mot_de_passe toujours absente',
                    columns: columns.map(c => c.name)
                });
            });
        });
    });
});
// ROUTE TEMPORAIRE POUR AJOUTER TOUS LES UTILISATEURS
router.get('/seed', (req, res) => {
    const users = [
        // Médecins
        { nom: 'Dellal', prenom: 'Jamal', poste: 'medecin', email: 'jean.dupont@chat.com', telephone: '0612345601', mot_de_passe: 'password123', statut: 'actif' },
        { nom: 'Mansouri', prenom: 'Soumia', poste: 'medecin', email: 'sophie.martin@chat.com', telephone: '0612345602', mot_de_passe: 'password123', statut: 'actif' },
        // Infirmiers
        { nom: 'Benammar', prenom: 'Khaled', poste: 'infirmier', email: 'khaled.benammar@chat.com', telephone: '0612345610', mot_de_passe: 'password123', statut: 'actif' },
        { nom: 'Zahra', prenom: 'Fatima', poste: 'infirmier', email: 'fatima.zahra@chat.com', telephone: '0612345611', mot_de_passe: 'password123', statut: 'actif' },
        // Administratif (déjà existant)
        { nom: 'Admin', prenom: 'Principal', poste: 'administratif', email: 'admin@chat.com', telephone: '0612345620', mot_de_passe: 'admin123', statut: 'actif' },
        // Hôtellerie
        { nom: 'Touril', prenom: 'Ali', poste: 'hotellerie', email: 'ali.toure@chat.com', telephone: '0612345630', mot_de_passe: 'password123', statut: 'actif' },
        // Logistique
        { nom: 'Dilawi', prenom: 'Moussa', poste: 'logistique', email: 'moussa.diop@chat.com', telephone: '0612345640', mot_de_passe: 'password123', statut: 'actif' },
        // Qualité
        { nom: 'Diallo', prenom: 'Aïcha', poste: 'qualite', email: 'aicha.diallo@chat.com', telephone: '0612345650', mot_de_passe: 'password123', statut: 'actif' },
        // Voyages
        { nom: 'Sowwane', prenom: 'Ousmane', poste: 'voyages', email: 'ousmane.sow@chat.com', telephone: '0612345660', mot_de_passe: 'password123', statut: 'actif' }
    ];

    let completed = 0;
    let errors = [];

    users.forEach(user => {
        const sql = `INSERT OR REPLACE INTO personnel (nom, prenom, poste, email, telephone, mot_de_passe, statut) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [user.nom, user.prenom, user.poste, user.email, user.telephone, user.mot_de_passe, user.statut], (err) => {
            if (err) {
                errors.push({ email: user.email, error: err.message });
            }
            completed++;
            
            if (completed === users.length) {
                if (errors.length > 0) {
                    res.status(500).json({ message: '⚠️ Certains utilisateurs n\'ont pas été ajoutés', errors });
                } else {
                    res.json({ message: '✅ Tous les utilisateurs ont été ajoutés avec succès', users: users.map(u => ({ email: u.email, role: u.poste })) });
                }
            }
        });
    });
});
module.exports = router;
