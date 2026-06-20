// frontend/js/utils.js

// ============================================
// FONCTION GÉNÉRIQUE D'AFFICHAGE DE LISTE
// ============================================

function afficherListe(containerId, data, formateur, templateFn) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("❌ Élément #" + containerId + " introuvable.");
        return;
    }

    if (Array.isArray(data) && data.length > 0) {
        let html = '';
        data.forEach(item => {
            try {
                const f = formateur(item);
                html += templateFn(f);
            } catch (e) {
                console.error("❌ Erreur de formatage pour l'item :", item, e);
            }
        });
        container.innerHTML = html;
    } else {
        container.innerHTML = '<p class="text-center text-muted">Aucune donnée disponible</p>';
    }
}

// ============================================
// FORMATAGE DES DONNÉES PAR TYPE
// ============================================

// --- CHAMBRES ---
function formaterChambre(c) {
    return {
        id: c.id_chambre,
        numero: c.numero || 'N/A',
        type: c.type || 'Standard',
        capacite: c.capacite || 1,
        statut: c.statut || 'Libre',
        statutBadge: c.statut === 'occupee' ? 'danger' : c.statut === 'libre' ? 'success' : 'warning'
    };
}

// --- REPAS / COMMANDES ---
function formaterCommande(c) {
    return {
        id: c.id_commande || c.id,
        patient: c.beneficiaire?.nom || c.nom || 'Inconnu',
        patientPrenom: c.beneficiaire?.prenom || c.prenom || '',
        repas: c.repas || c.type || 'Non précisé',
        quantite: c.quantite || 1,
        statut: c.statut || 'En attente',
        date: c.date_commande ? new Date(c.date_commande).toLocaleString() : new Date().toLocaleString(),
        statutBadge: c.statut === 'livre' ? 'success' : c.statut === 'en_cours' ? 'warning' : 'secondary'
    };
}

// --- COURSES / VOYAGES ---
function formaterCourse(c) {
    return {
        id: c.id_course || c.id,
        destination: c.destination || 'N/A',
        depart: c.depart || 'N/A',
        chauffeur: c.chauffeur?.nom || c.chauffeur_nom || 'Non attribué',
        vehicule: c.vehicule?.immatriculation || c.vehicule_immatriculation || 'N/A',
        date: c.date_course ? new Date(c.date_course).toLocaleString() : new Date().toLocaleString(),
        statut: c.statut || 'Planifiée',
        statutBadge: c.statut === 'terminee' ? 'success' : c.statut === 'en_cours' ? 'warning' : 'secondary'
    };
}

// --- FACTURES ---
function formaterFacture(f) {
    return {
        id: f.id_facture || f.id,
        numero: f.numero || f.id_facture || 'N/A',
        patient: f.beneficiaire?.nom || f.nom || 'Inconnu',
        patientPrenom: f.beneficiaire?.prenom || f.prenom || '',
        montant: f.montant_ttc || f.montant || 0,
        date: f.date_emission ? new Date(f.date_emission).toLocaleDateString() : new Date().toLocaleDateString(),
        statut: f.statut || 'En attente',
        statutBadge: f.statut === 'payee' ? 'success' : 'warning'
    };
}

// --- MÉDICAMENTS / STOCKS ---
function formaterMedicament(m) {
    return {
        id: m.id_medicament || m.id,
        nom: m.nom || 'Inconnu',
        dosage: m.dosage || 'N/A',
        quantite: m.quantite || 0,
        seuil: m.seuil_alerte || 5,
        estAlerte: (m.quantite || 0) <= (m.seuil_alerte || 5)
    };
}

// --- CONSTANTES VITALES ---
function formaterConstante(c) {
    return {
        id: c.id_constante,
        patient: c.beneficiaire?.nom || c.patient_nom || 'Inconnu',
        patientPrenom: c.beneficiaire?.prenom || c.patient_prenom || '',
        tension: c.tension || 'N/A',
        pouls: c.pouls || 'N/A',
        temperature: c.temperature || 'N/A',
        saturation: c.saturation || 'N/A',
        chambre: c.chambre || 'N/A',
        date: c.date_prise ? new Date(c.date_prise).toLocaleString() : new Date().toLocaleString()
    };
}

// --- CONSULTATIONS ---
function formaterConsultation(c) {
    return {
        id: c.id_consultation,
        date: new Date(c.date_heure).toLocaleString(),
        motif: c.motif || 'Non précisé',
        statut: c.statut || 'Planifiée',
        statutBadge: c.statut === 'realisee' ? 'success' : c.statut === 'annulee' ? 'danger' : 'warning',
        patient: {
            nom: c.beneficiaire?.nom || c.patient_nom || 'Inconnu',
            prenom: c.beneficiaire?.prenom || c.patient_prenom || ''
        },
        medecin: {
            nom: c.medecin_nom || 'Médecin',
            prenom: c.medecin_prenom || ''
        }
    };
}

// --- RENDEZ-VOUS ---
function formaterRendezVous(r) {
    return {
        id: r.id_rdv || r.id_rendez_vous,
        date: new Date(r.date_rdv).toLocaleString(),
        motif: r.motif || 'Consultation',
        statut: r.statut || 'Planifié',
        statutBadge: r.statut === 'confirme' ? 'success' : r.statut === 'annule' ? 'danger' : 'warning',
        patient: {
            nom: r.beneficiaire?.nom || r.patient_nom || 'Inconnu',
            prenom: r.beneficiaire?.prenom || r.patient_prenom || ''
        },
        medecin: {
            nom: r.medecin_nom || 'Médecin',
            prenom: r.medecin_prenom || ''
        }
    };
}

// --- BÉNÉFICIAIRES (PATIENTS) ---
function formaterBeneficiaire(b) {
    return {
        id: b.id_beneficiaire,
        nom: b.nom || 'Inconnu',
        prenom: b.prenom || '',
        telephone: b.telephone || 'Non renseigné',
        email: b.email || 'Non renseigné',
        adresse: b.adresse || 'Non renseignée',
        statut: b.statut || 'Actif',
        statutBadge: b.statut === 'actif' ? 'success' : 'secondary'
    };
}

// --- PERSONNEL ---
function formaterPersonnel(p) {
    return {
        id: p.id_personnel,
        nom: p.nom || 'Inconnu',
        prenom: p.prenom || '',
        poste: p.poste || 'N/A',
        email: p.email || 'Non renseigné',
        telephone: p.telephone || 'Non renseigné',
        statut: p.statut || 'Actif'
    };
}

// ============================================
// EXPOSITION GLOBALE (pour les pages HTML)
// ============================================

// Rendre les fonctions disponibles globalement
window.afficherListe = afficherListe;
window.formaterChambre = formaterChambre;
window.formaterCommande = formaterCommande;
window.formaterCourse = formaterCourse;
window.formaterFacture = formaterFacture;
window.formaterMedicament = formaterMedicament;
window.formaterConstante = formaterConstante;
window.formaterConsultation = formaterConsultation;
window.formaterRendezVous = formaterRendezVous;
window.formaterBeneficiaire = formaterBeneficiaire;
window.formaterPersonnel = formaterPersonnel;
