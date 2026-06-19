const API = {
    baseURL: 'https://clinique-hoteliere-et-actions.onrender.com/api',

    getToken() { return localStorage.getItem('token'); },

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

    // ============================================
    // CONSULTATIONS
    // ============================================
    async getConsultations(medecinId) {
        if (!medecinId) return [];
        return this.get(`/consultations/medecin/${medecinId}`);
    },

    // ============================================
    // RENDEZ-VOUS
    // ============================================
    async getRendezVous(medecinId) {
        if (!medecinId) return [];
        return this.get(`/rendez-vous/medecin/${medecinId}`);
    },

    // ============================================
    // STATISTIQUES
    // ============================================
    async getStats() {
        return this.get('/statistiques/dashboard');
    },

    async getStatsMedecin(medecinId) {
        if (!medecinId) return {};
        return this.get(`/stats/medecin/${medecinId}`);
    },

    // ============================================
    // PATIENTS (Bénéficiaires)
    // ============================================
    async getPatients() {
        return this.get('/beneficiaires');
    },

    // ============================================
    // CONSTANTES
    // ============================================
    async getConstantes() {
        return this.get('/constante');
    },

    // ============================================
    // CHAMBRES
    // ============================================
    async getChambres() {
        return this.get('/chambres');
    },

    // ============================================
    // STOCKS
    // ============================================
    async getStocks() {
        return this.get('/stocks');
    },

    // ============================================
    // QUALITÉ
    // ============================================
    async getQualite() {
        return this.get('/qualite/indicateurs');
    },

    // ============================================
    // FACTURES
    // ============================================
    async getFactures() {
        return this.get('/factures');
    },

    // ============================================
    // UTILITAIRES
    // ============================================
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    }
};
