-- Ajout du champ mot_de_passe à la table personnel
ALTER TABLE personnel ADD COLUMN mot_de_passe TEXT;

-- Mise à jour des médecins existants
UPDATE personnel SET mot_de_passe = 'password123' WHERE poste = 'medecin';

-- Mise à jour des autres personnels (optionnel)
UPDATE personnel SET mot_de_passe = 'password123' WHERE mot_de_passe IS NULL;
-- ============================================
-- 1. AJOUT DE LA COLONNE MOT DE PASSE
-- ============================================
ALTER TABLE personnel ADD COLUMN mot_de_passe TEXT;

-- ============================================
-- 2. SUPPRESSION DES ANCIENS UTILISATEURS (optionnel)
-- ============================================
-- DELETE FROM personnel WHERE email LIKE '%@chat.com';

-- ============================================
-- 3. CRÉATION DES UTILISATEURS PAR PROFIL
-- ============================================

-- MÉDECIN (Dr. Jean Dupont)
INSERT INTO personnel (nom, prenom, poste, email, telephone, mot_de_passe, statut) 
VALUES ('zarguennif', 'kada', 'medecin', 'jean.dupont@chat.com', '0612345601', 'password123', 'actif');

-- MÉDECIN 2 (Dr. Sophie Martin)
INSERT INTO personnel (nom, prenom, poste, email, telephone, mot_de_passe, statut) 
VALUES ('messaoud', 'mohamed', 'medecin', 'sophie.martin@chat.com', '0612345602', 'password123', 'actif');

-- INFIRMIER (Khaled Benammar)
INSERT INTO personnel (nom, prenom, poste, email, telephone, mot_de_passe, statut) 
VALUES ('Benammar', 'Khaled', 'infirmier', 'khaled.benammar@chat.com', '0612345610', 'password123', 'actif');

-- INFIRMIER 2 (Fatima Zahra)
INSERT INTO personnel (nom, prenom, poste, email, telephone, mot_de_passe, statut) 
VALUES ('Zahra', 'Fatima', 'infirmier', 'fatima.zahra@chat.com', '0612345611', 'password123', 'actif');

-- ADMINISTRATIF (Admin Principal)
INSERT INTO personnel (nom, prenom, poste, email, telephone, mot_de_passe, statut) 
VALUES ('Admin', 'Principal', 'administratif', 'admin@chat.com', '0612345620', 'admin123', 'actif');

-- HÔTELLERIE (Ali Touré)
INSERT INTO personnel (nom, prenom, poste, email, telephone, mot_de_passe, statut) 
VALUES ('Touré', 'Ali', 'hotellerie', 'ali.toure@chat.com', '0612345630', 'password123', 'actif');

-- LOGISTIQUE (Moussa Diop)
INSERT INTO personnel (nom, prenom, poste, email, telephone, mot_de_passe, statut) 
VALUES ('Dali', 'Moussa', 'logistique', 'moussa.diop@chat.com', '0612345640', 'password123', 'actif');

-- QUALITÉ (Aïcha Diallo)
INSERT INTO personnel (nom, prenom, poste, email, telephone, mot_de_passe, statut) 
VALUES ('Diafi', 'Aïcha', 'qualite', 'aicha.diallo@chat.com', '0612345650', 'password123', 'actif');

-- VOYAGES (Ousmane Sow)
INSERT INTO personnel (nom, prenom, poste, email, telephone, mot_de_passe, statut) 
VALUES ('Sowane', 'Ousmane', 'voyages', 'ousmane.sow@chat.com', '0612345660', 'password123', 'actif');

-- ============================================
-- 4. TABLE DIRECTION (si elle existe)
-- ============================================
-- INSERT INTO direction (nom, prenom, poste, email, telephone, mot_de_passe, statut) 
-- VALUES ('Fall', 'Mamadou', 'direction', 'direction@chat.com', '0612345700', 'directeur123', 'actif');

-- ============================================
-- 5. VÉRIFICATION FINALE
-- ============================================
SELECT id_personnel, nom, prenom, poste, email, mot_de_passe FROM personnel;
