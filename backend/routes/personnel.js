const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
    db.all('SELECT * FROM personnel', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
// GET tous les médecins
router.get('/medecins', (req, res) => {
    db.all("SELECT id_personnel, nom, prenom FROM personnel WHERE poste LIKE '%médecin%' OR poste LIKE '%Médecin%'", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});
// POST ajouter un membre du personnel
router.post('/', (req, res) => {
    const { nom, prenom, poste, email, telephone, date_embauche, statut } = req.body;
    if (!nom || !prenom) {
        return res.status(400).json({ error: "Nom et prénom requis" });
    }
    db.run(
        `INSERT INTO personnel (nom, prenom, poste, email, telephone, date_embauche, statut)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nom, prenom, poste, email, telephone, date_embauche || null, statut || 'actif'],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID, message: "Personnel ajouté" });
            }
        }
    );
});
// GET /api/personnel/stats
router.get('/stats', (req, res) => {
    Promise.all([
        new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM personnel WHERE poste = "medecin"', (err, row) => {
                if (err) reject(err);
                else resolve(row?.count || 0);
            });
        }),
        new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM personnel WHERE poste = "infirmier"', (err, row) => {
                if (err) reject(err);
                else resolve(row?.count || 0);
            });
        }),
        new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM personnel WHERE poste = "chauffeur"', (err, row) => {
                if (err) reject(err);
                else resolve(row?.count || 0);
            });
        })
    ]).then(([medecins, infirmiers, chauffeurs]) => {
        res.json({
            medecins: medecins,
            infirmiers: infirmiers,
            chauffeurs: chauffeurs
        });
    }).catch(err => {
        res.status(500).json({ error: err.message });
    });
});

module.exports = router;