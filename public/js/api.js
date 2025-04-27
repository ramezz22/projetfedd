// Fonctions API communes
async function fetchPhones() {
    try {
        const response = await fetch('http://localhost:3000/phones');
        const data = await response.json();
        return data.success ? data.data : [];
    } catch (error) {
        console.error('Erreur:', error);
        return [];
    }
}

async function submitContactForm(formData) {
    try {
        const response = await fetch('http://localhost:3000/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Erreur:', error);
        return false;
    }
}