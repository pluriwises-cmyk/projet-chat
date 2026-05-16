const express = require('express');
const router = express.Router();
const db = require('../database/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'hopital_saint_jean_secret_key';

// GET tous les bénéficiaires
router.get('/', (req, res) => {
    db.all('SELECT * FROM beneficiaire', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// GET un bénéficiaire par ID
router.get('/:id', (req, res) => {
    db.get('SELECT * FROM beneficiaire WHERE id_beneficiaire = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (!row) {
            res.status(404).json({ error: "Bénéficiaire non trouvé" });
        } else {
            res.json(row);
        }
    });
});

// POST ajouter un bénéficiaire
router.post('/', (req, res) => {
    const { nom, prenom, telephone, email, adresse } = req.body;
    if (!nom || !prenom) {
        return res.status(400).json({ error: "Nom et prénom requis" });
    }
    db.run(
        'INSERT INTO beneficiaire (nom, prenom, telephone, email, adresse) VALUES (?, ?, ?, ?, ?)',
        [nom, prenom, telephone, email, adresse],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                const idBeneficiaire = this.lastID;
                // Générer un token pour le nouveau patient
                const token = jwt.sign(
                    { id: idBeneficiaire, telephone: telephone, role: 'patient' },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );
                res.status(201).json({
                    id: idBeneficiaire,
                    message: "Patient ajouté",
                    token: token
                });
            }
        }
    );
});
// POST /api/beneficiaires/inscription
router.post('/inscription', (req, res) => {
    const { nom, prenom, telephone, email, adresse, tempToken } = req.body;
    
    if (!nom || !prenom || !telephone) {
        return res.status(400).json({ error: 'Nom, prénom et téléphone requis' });
    }
    
    // Vérifier le token temporaire (optionnel)
    
    // Insérer le nouveau bénéficiaire
    db.run(
        `INSERT INTO beneficiaire (nom, prenom, telephone, email, adresse, type, statut)
         VALUES (?, ?, ?, ?, ?, 'patient', 'actif')`,
        [nom, prenom, telephone, email, adresse],
        function(err) {
            if (err) {
                console.error('Erreur insertion:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // Générer le token JWT
            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
                { id: this.lastID, telephone: telephone, role: 'patient' },
                'hopital_saint_jean_secret_key',
                { expiresIn: '7d' }
            );
            
            res.json({
                success: true,
                message: 'Inscription réussie',
                token: token,
                id: this.lastID
            });
        }
    );
});
module.exports = router;