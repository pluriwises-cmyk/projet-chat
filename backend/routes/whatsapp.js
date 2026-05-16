const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const JWT_SECRET = 'hopital_saint_jean_secret_key';

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Demander un code
router.post('/request-code', (req, res) => {
    console.log('📱 Demande de code reçue:', req.body);
    const { telephone } = req.body;

    if (!telephone) {
        return res.status(400).json({ error: 'Téléphone requis' });
    }

    const code = generateCode();
    const dateExpiration = new Date();
    dateExpiration.setMinutes(dateExpiration.getMinutes() + 2);

    console.log(`✅ Code généré pour ${telephone}: ${code}`);

    db.run('DELETE FROM whatsapp_validation WHERE telephone = ?', [telephone]);

    db.run(
        `INSERT INTO whatsapp_validation (telephone, code, date_envoi, date_expiration, statut, tentative)
         VALUES (?, ?, datetime('now'), ?, 'en_attente', 0)`,
        [telephone, code, dateExpiration.toISOString()],
        function (err) {
            if (err) {
                console.error('Erreur insertion:', err);
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

// Vérifier le code
router.post('/verify-code', (req, res) => {
    console.log('🔍 Vérification code reçue:', req.body);
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
                 SET statut = 'valide', date_validation = datetime('now')
                 WHERE id_validation = ?`,
                [validation.id_validation],
                (err) => {
                    if (err) {
                        console.error('Erreur update:', err);
                        return res.status(500).json({ error: 'Erreur serveur' });
                    }

                    // Vérifier d'abord dans personnel (médecins, infirmiers)
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

                        // Sinon, vérifier dans beneficiaire (patients)
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