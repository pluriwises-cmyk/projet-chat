// frontend/js/api.js
const API = {
    baseURL: 'https://clinique-hoteliere-et-actions.onrender.com/api',

    getToken() {
        return localStorage.getItem('token');
    },

    getHeaders() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    },

    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ API GET Error:', error);
            throw error;
        }
    },

    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ API POST Error:', error);
            throw error;
        }
    },

    // Récupérer les consultations d'un médecin
    async getConsultations(medecinId) {
        return this.get(`/consultations?medecin_id=${medecinId}`);
    },

    // Récupérer les patients
    async getPatients() {
        return this.get('/beneficiaires');
    },

    // Récupérer les rendez-vous
    async getRendezVous() {
        return this.get('/rendez-vous');
    },

    // Récupérer les statistiques
    async getStats() {
        return this.get('/statistiques/dashboard');
    },

    // Récupérer les constantes d'un patient
    async getConstantes() {
        return this.get('/constantes');
    },

    // Récupérer les stocks
    async getStocks() {
        return this.get('/stocks');
    },

    // Récupérer les indicateurs qualité
    async getQualite() {
        return this.get('/qualite/indicateurs');
    },

    // Récupérer les factures
    async getFactures() {
        return this.get('/factures');
    },

    // Déconnexion
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    },

    // Récupérer l'utilisateur connecté
    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    }
};