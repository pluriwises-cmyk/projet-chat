-- Ajout du champ mot_de_passe à la table personnel
ALTER TABLE personnel ADD COLUMN mot_de_passe TEXT;

-- Mise à jour des médecins existants
UPDATE personnel SET mot_de_passe = 'password123' WHERE poste = 'medecin';

-- Mise à jour des autres personnels (optionnel)
UPDATE personnel SET mot_de_passe = 'password123' WHERE mot_de_passe IS NULL;
