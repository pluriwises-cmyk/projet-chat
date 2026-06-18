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
    const { telephone } = req.body;
    if (!telephone) return res.status(400).json({ error: 'Téléphone requis' });

    const code = generateCode();
    const dateExpiration = new Date();
    dateExpiration.setMinutes(dateExpiration.getMinutes() + 2);

    db.run('DELETE FROM whatsapp_validation WHERE telephone = ?', [telephone], (err) => {
        db.run(
            `INSERT INTO whatsapp_validation (telephone, code, date_expiration, statut, tentative) 
             VALUES (?, ?, ?, 'en_attente', 0)`,
            [telephone, code, dateExpiration.toISOString()],
            (err) => {
                if (err) return res.status(500).json({ error: 'Erreur serveur' });
                res.json({ success: true, code_dev: code });
            }
        );
    });
});

// Vérifier le code (à garder tel quel)
router.post('/verify-code', (req, res) => {
    const { telephone, code } = req.body;
    if (!telephone || !code) return res.status(400).json({ error: 'Téléphone et code requis' });

    db.get(
        `SELECT * FROM whatsapp_validation 
         WHERE telephone = ? AND code = ? AND statut = 'en_attente'
         ORDER BY id_validation DESC LIMIT 1`,
        [telephone, code],
        (err, validation) => {
            if (err) return res.status(500).json({ error: 'Erreur serveur' });
            if (!validation) return res.status(400).json({ error: 'Code invalide' });

            const dateExpiration = new Date(validation.date_expiration);
            if (dateExpiration < new Date()) {
                db.run('UPDATE whatsapp_validation SET statut = ? WHERE id_validation = ?', ['expire', validation.id_validation]);
                return res.status(400).json({ error: 'Code expiré' });
            }

            db.run(
                `UPDATE whatsapp_validation SET statut = 'valide', date_validation = NOW() WHERE id_validation = ?`,
                [validation.id_validation],
                (err) => {
                    if (err) return res.status(500).json({ error: 'Erreur serveur' });

                    db.get('SELECT * FROM personnel WHERE telephone = ?', [telephone], (err, personnel) => {
                        if (personnel) {
                            const token = jwt.sign(
                                { id: personnel.id_personnel, telephone: personnel.telephone, nom: personnel.nom, prenom: personnel.prenom, role: personnel.poste || 'personnel', type: 'personnel' },
                                JWT_SECRET,
                                { expiresIn: '7d' }
                            );
                            return res.json({ success: true, token, role: personnel.poste || 'personnel', user: { id: personnel.id_personnel, nom: personnel.nom, prenom: personnel.prenom, telephone: personnel.telephone, role: personnel.poste || 'personnel' } });
                        }

                        db.get('SELECT * FROM beneficiaire WHERE telephone = ? OR whatsapp = ?', [telephone, telephone], (err, beneficiaire) => {
                            if (beneficiaire) {
                                const token = jwt.sign(
                                    { id: beneficiaire.id_beneficiaire, telephone: beneficiaire.telephone, nom: beneficiaire.nom, prenom: beneficiaire.prenom, role: 'patient', type: 'patient' },
                                    JWT_SECRET,
                                    { expiresIn: '7d' }
                                );
                                return res.json({ success: true, token, role: 'patient' });
                            } else {
                                const tempToken = jwt.sign({ telephone: telephone, type: 'temp' }, JWT_SECRET, { expiresIn: '1h' });
                                return res.json({ success: true, telephone, tempToken });
                            }
                        });
                    });
                }
            );
        }
    );
});

module.exports = router;
