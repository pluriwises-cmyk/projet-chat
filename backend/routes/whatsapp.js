// backend/routes/whatsapp.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const JWT_SECRET = 'hopital_saint_jean_secret_key';

// ==========================================
// 1. GÉNÉRER UN CODE
// ==========================================
router.post('/request-code', (req, res) => {
    const { telephone } = req.body;

    if (!telephone) {
        return res.status(400).json({ error: 'Téléphone requis' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 2);

    // Supprimer l'ancien code pour ce numéro
    db.run('DELETE FROM whatsapp_validation WHERE telephone = ?', [telephone], (err) => {
        if (err) {
            console.error('Erreur suppression ancien code:', err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        // Insérer le nouveau code
        db.run(
            `INSERT INTO whatsapp_validation (telephone, code, date_expiration, statut, tentative)
             VALUES (?, ?, ?, 'en_attente', 0)`,
            [telephone, code, expiration.toISOString()],
            (err) => {
                if (err) {
                    console.error('Erreur insertion code:', err);
                    return res.status(500).json({ error: 'Erreur serveur' });
                }

                res.json({
                    success: true,
                    message: 'Code envoyé',
                    code_dev: code
                });
            }
        );
    });
});

// ==========================================
// 2. VÉRIFIER UN CODE
// ==========================================
router.post('/verify-code', (req, res) => {
    const { telephone, code } = req.body;

    if (!telephone || !code) {
        return res.status(400).json({ error: 'Téléphone et code requis' });
    }

    db.get(
        `SELECT * FROM whatsapp_validation
         WHERE telephone = ? AND code = ? AND statut = 'en_attente'
         ORDER BY id_validation DESC LIMIT 1`,
        [telephone, code],
        (err, validation) => {
            if (err) {
                console.error('Erreur DB:', err);
                return res.status(500).json({ error: 'Erreur serveur' });
            }

            if (!validation) {
                return res.status(400).json({ error: 'Code invalide' });
            }

            const dateExpiration = new Date(validation.date_expiration);
            if (dateExpiration < new Date()) {
                db.run('UPDATE whatsapp_validation SET statut = ? WHERE id_validation = ?',
                    ['expire', validation.id_validation]);
                return res.status(400).json({ error: 'Code expiré' });
            }

            db.run(
                `UPDATE whatsapp_validation
                 SET statut = 'valide', date_validation = NOW()
                 WHERE id_validation = ?`,
                [validation.id_validation],
                (err) => {
                    if (err) {
                        console.error('Erreur update:', err);
                        return res.status(500).json({ error: 'Erreur serveur' });
                    }

                    // Vérifier dans personnel (médecins, infirmiers)
                    db.get('SELECT * FROM personnel WHERE telephone = ?', [telephone], (err, personnel) => {
                        if (err) {
                            console.error('Erreur DB personnel:', err);
                            return res.status(500).json({ error: 'Erreur serveur' });
                        }

                        if (personnel) {
                            const role = personnel.poste || 'personnel';
                            const token = jwt.sign(
                                {
                                    id: personnel.id_personnel,
                                    telephone: personnel.telephone,
                                    nom: personnel.nom,
                                    prenom: personnel.prenom,
                                    role: role,
                                    type: 'personnel'
                                },
                                JWT_SECRET,
                                { expiresIn: '7d' }
                            );

                            return res.json({
                                success: true,
                                message: 'Connexion réussie',
                                token: token,
                                role: role,
                                user: {
                                    id: personnel.id_personnel,
                                    nom: personnel.nom,
                                    prenom: personnel.prenom,
                                    telephone: personnel.telephone,
                                    role: role
                                }
                            });
                        }

                        // Vérifier dans beneficiaire (patients)
                        db.get('SELECT * FROM beneficiaire WHERE telephone = ? OR whatsapp = ?',
                            [telephone, telephone],
                            (err, beneficiaire) => {
                                if (err) {
                                    console.error('Erreur DB beneficiaire:', err);
                                    return res.status(500).json({ error: 'Erreur serveur' });
                                }

                                if (beneficiaire) {
                                    const token = jwt.sign(
                                        {
                                            id: beneficiaire.id_beneficiaire,
                                            telephone: beneficiaire.telephone,
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
                                        message: 'Connexion réussie',
                                        token: token,
                                        role: 'patient'
                                    });
                                } else {
                                    const tempToken = jwt.sign(
                                        { telephone: telephone, type: 'temp' },
                                        JWT_SECRET,
                                        { expiresIn: '1h' }
                                    );
                                    return res.json({
                                        success: true,
                                        message: 'Code valide, inscription requise',
                                        telephone: telephone,
                                        tempToken: tempToken
                                    });
                                }
                            }
                        );
                    });
                }
            );
        }
    );
});

module.exports = router;
