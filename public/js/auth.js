// Gestion de l'authentification
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            try {
                const response = await fetch('http://localhost:3000/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    updateAuthUI(data.user);
                    closeModal('login-modal');
                    alert('Connexion réussie !');
                } else {
                    alert(data.message || 'Erreur de connexion');
                }
            } catch (error) {
                console.error('Erreur:', error);
                alert('Erreur de connexion');
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-confirm').value;
            
            // Validation
            if (password !== confirmPassword) {
                alert('Les mots de passe ne correspondent pas');
                return;
            }
            
            if (password.length < 8) {
                alert('Le mot de passe doit contenir au moins 8 caractères');
                return;
            }
            
            try {
                const response = await fetch('http://localhost:3000/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, confirmPassword })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    updateAuthUI(data.user);
                    closeModal('register-modal');
                    alert('Inscription réussie !');
                } else {
                    alert(data.message || 'Erreur d\'inscription');
                }
            } catch (error) {
                console.error('Erreur:', error);
                alert('Erreur d\'inscription');
            }
        });
    }
    
    function updateAuthUI(user) {
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.innerHTML = `<i class="fas fa-user-check mr-2"></i>${user.name}`;
        }
    }
    
    // Vérifier l'état d'authentification au chargement
    checkAuthStatus();
});

function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));
    const loginButton = document.getElementById('login-button');

    if (token && user && loginButton) {
        loginButton.innerHTML = `<i class="fas fa-user-check mr-2"></i>${user.name}`;
    }
}