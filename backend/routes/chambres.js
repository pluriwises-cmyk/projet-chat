const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ============================================
// GET Toutes les chambres
// ============================================
router.get('/', (req, res) => {
    const query = `
        SELECT 
            id_chambre, 
            numero, 
            type, 
            capacite, 
            statut 
        FROM chambre 
        ORDER BY numero ASC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erreur GET chambres:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// ============================================
// GET Une chambre par ID
// ============================================
router.get('/:id', (req, res) => {
    const id = req.params.id;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }
    
    const query = `
        SELECT 
            id_chambre, 
            numero, 
            type, 
            capacite, 
            statut 
        FROM chambre 
        WHERE id_chambre = $1
    `;
    
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('Erreur GET chambre:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "Chambre non trouvée" });
        }
        res.json(row);
    });
});

// ============================================
// GET Chambres disponibles (libres)
// ============================================
router.get('/disponibles', (req, res) => {
    const query = `
        SELECT 
            id_chambre, 
            numero, 
            type, 
            capacite, 
            statut 
        FROM chambre 
        WHERE statut = 'libre'
        ORDER BY numero ASC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erreur GET chambres disponibles:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// ============================================
// GET Chambres occupées
// ============================================
router.get('/occupees', (req, res) => {
    const query = `
        SELECT 
            id_chambre, 
            numero, 
            type, 
            capacite, 
            statut 
        FROM chambre 
        WHERE statut = 'occupee'
        ORDER BY numero ASC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erreur GET chambres occupées:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// ============================================
// GET Chambres par type
// ============================================
router.get('/type/:type', (req, res) => {
    const type = req.params.type;
    
    if (!type) {
        return res.status(400).json({ error: "Type de chambre requis" });
    }
    
    const query = `
        SELECT 
            id_chambre, 
            numero, 
            type, 
            capacite, 
            statut 
        FROM chambre 
        WHERE type = $1
        ORDER BY numero ASC
    `;
    
    db.all(query, [type], (err, rows) => {
        if (err) {
            console.error('Erreur GET chambres par type:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// ============================================
// GET Chambres avec statistiques
// ============================================
router.get('/stats/globales', (req, res) => {
    const query = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN statut = 'libre' THEN 1 ELSE 0 END) as libres,
            SUM(CASE WHEN statut = 'occupee' THEN 1 ELSE 0 END) as occupees,
            SUM(CASE WHEN statut = 'reservee' THEN 1 ELSE 0 END) as reservees,
            SUM(CASE WHEN statut = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
            type,
            COUNT(*) as total_par_type
        FROM chambre
        GROUP BY type
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Erreur GET stats chambres:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// ============================================
// POST Ajouter une chambre (Version Supabase - Corrigée)
// ============================================
router.post('/', async (req, res) => {
    const { numero, type, capacite, statut } = req.body;

    if (!numero) {
        return res.status(400).json({ error: "Numéro de chambre requis" });
    }

    try {
        // Vérification avec Supabase
        const { data: existing, error: checkError } = await supabase
            .from('chambre')
            .select('id_chambre')
            .eq('numero', numero)
            .maybeSingle();

        if (checkError) {
            console.error('❌ Erreur vérification chambre:', checkError);
            return res.status(500).json({ error: checkError.message });
        }

        if (existing) {
            return res.status(409).json({
                error: "Une chambre avec ce numéro existe déjà"
            });
        }

        // Insertion
        const { data, error } = await supabase
            .from('chambre')
            .insert([{
                numero,
                type: type || 'standard',
                capacite: capacite || 1,
                statut: statut || 'libre'
            }])
            .select();

        if (error) {
            console.error('❌ Erreur insertion chambre:', error);
            return res.status(500).json({ error: error.message });
        }

        res.status(201).json({
            id: data[0].id_chambre,
            message: "Chambre ajoutée avec succès"
        });

    } catch (err) {
        console.error('❌ Erreur POST chambre:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PUT Modifier une chambre
// ============================================
router.put('/:id', (req, res) => {
    const id = req.params.id;
    const { numero, type, capacite, statut } = req.body;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }
    
    let updates = [];
    let values = [];
    let paramIndex = 1;
    
    if (numero !== undefined) { 
        updates.push(`numero = $${paramIndex++}`); 
        values.push(numero); 
    }
    if (type !== undefined) { 
        updates.push(`type = $${paramIndex++}`); 
        values.push(type); 
    }
    if (capacite !== undefined) { 
        updates.push(`capacite = $${paramIndex++}`); 
        values.push(capacite); 
    }
    if (statut !== undefined) { 
        updates.push(`statut = $${paramIndex++}`); 
        values.push(statut); 
    }
    
    if (updates.length === 0) {
        return res.status(400).json({ error: "Aucune donnée à modifier" });
    }
    
    values.push(id);
    const query = `
        UPDATE chambre 
        SET ${updates.join(', ')}
        WHERE id_chambre = $${paramIndex}
        RETURNING id_chambre
    `;
    
    db.get(query, values, (err, result) => {
        if (err) {
            console.error('Erreur UPDATE chambre:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!result) {
            return res.status(404).json({ error: "Chambre non trouvée" });
        }
        res.json({ 
            message: "Chambre modifiée avec succès",
            id: result.id_chambre
        });
    });
});

// ============================================
// PATCH Changer le statut d'une chambre
// ============================================
router.patch('/:id/statut', (req, res) => {
    const id = req.params.id;
    const { statut } = req.body;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }
    
    if (!statut) {
        return res.status(400).json({ error: "Statut requis" });
    }
    
    const allowedStatuts = ['libre', 'occupee', 'reservee', 'maintenance'];
    if (!allowedStatuts.includes(statut)) {
        return res.status(400).json({ 
            error: "Statut invalide",
            allowed: allowedStatuts
        });
    }
    
    const query = `
        UPDATE chambre 
        SET statut = $1
        WHERE id_chambre = $2
        RETURNING id_chambre, numero, statut
    `;
    
    db.get(query, [statut, id], (err, result) => {
        if (err) {
            console.error('Erreur PATCH statut chambre:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!result) {
            return res.status(404).json({ error: "Chambre non trouvée" });
        }
        res.json({ 
            message: "Statut mis à jour avec succès",
            chambre: {
                id: result.id_chambre,
                numero: result.numero,
                statut: result.statut
            }
        });
    });
});

// ============================================
// DELETE Supprimer une chambre
// ============================================
router.delete('/:id', (req, res) => {
    const id = req.params.id;
    
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }
    
    // Vérifier si la chambre est occupée
    db.get('SELECT id_admission FROM admission WHERE id_chambre = $1 AND statut = $2 LIMIT 1', 
        [id, 'active'], 
        (err, admission) => {
            if (err) {
                console.warn('⚠️ Table admission non trouvée ou erreur:', err.message);
            } else if (admission) {
                return res.status(409).json({ 
                    error: "Impossible de supprimer une chambre occupée" 
                });
            }
            
            const query = `
                DELETE FROM chambre 
                WHERE id_chambre = $1
                RETURNING id_chambre
            `;
            
            db.get(query, [id], (err, result) => {
                if (err) {
                    console.error('Erreur DELETE chambre:', err);
                    return res.status(500).json({ error: err.message });
                }
                if (!result) {
                    return res.status(404).json({ error: "Chambre non trouvée" });
                }
                res.json({ 
                    message: "Chambre supprimée avec succès",
                    id: result.id_chambre
                });
            });
        }
    );
});

module.exports = router;
