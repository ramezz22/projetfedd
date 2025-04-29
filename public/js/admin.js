// Vérifier la connexion admin
function checkAdmin() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        showLoginModal();
        throw new Error('Non authentifié');
    }

    return fetch('/checkAdmin', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            showLoginModal();
            throw new Error('Accès non autorisé');
        }
        return response.json();
    })
    .catch(error => {
        console.error('Erreur:', error);
        showLoginModal();
        throw error;
    });
}

// Déconnexion admin
function logout() {
    localStorage.removeItem('token');
    fetch('/logout', { 
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .finally(() => {
        showLoginModal();
    });
}

// Afficher le modal de login
function showLoginModal() {
    // Si vous utilisez Bootstrap
    const loginModal = new bootstrap.Modal(document.getElementById('login-modal'));
    loginModal.show();
    
    // Si vous avez un système custom
    // document.getElementById('login-modal').classList.remove('hidden');
}

// Variables globales
let currentPhoneId = null;

// Charger les statistiques
async function loadOverview() {
    try {
        await checkAdmin();
        
        const response = await fetch('/admin/overview', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur de chargement');
        
        const data = await response.json();
        
        document.getElementById('totalUsers').textContent = data.users;
        document.getElementById('totalOrders').textContent = data.orders;
        document.getElementById('totalPhones').textContent = data.phones;
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('danger', 'Erreur lors du chargement des statistiques');
    }
}

// Afficher une alerte
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.container-fluid');
    container.prepend(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Gestion des utilisateurs
async function loadUsers() {
    try {
        await checkAdmin();
        
        const response = await fetch('/admin/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur de chargement');
        
        const users = await response.json();
        const tbody = document.querySelector('#users-table tbody');
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.is_admin ? '<span class="badge bg-success">Oui</span>' : '<span class="badge bg-secondary">Non</span>'}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">
                        <i class="bi bi-trash"></i> Supprimer
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('danger', 'Erreur lors du chargement des utilisateurs');
    }
}

async function deleteUser(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    
    try {
        await checkAdmin();
        
        const response = await fetch(`/admin/users/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur de suppression');
        
        showAlert('success', 'Utilisateur supprimé avec succès');
        loadUsers();
        loadOverview();
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('danger', 'Erreur lors de la suppression de l\'utilisateur');
    }
}

// Gestion des téléphones
function showAddPhoneForm(phone = null) {
    const form = document.getElementById('phoneForm');
    const formTitle = document.getElementById('formTitle');
    const formElement = document.getElementById('addEditPhoneForm');
    
    if (phone) {
        formTitle.textContent = 'Modifier Téléphone';
        currentPhoneId = phone.id;
        
        formElement.querySelector('[name="name"]').value = phone.name;
        formElement.querySelector('[name="brand"]').value = phone.brand;
        formElement.querySelector('[name="price"]').value = phone.price;
        formElement.querySelector('[name="image"]').value = phone.image;
        formElement.querySelector('[name="description"]').value = phone.description;
        formElement.querySelector('[name="stock"]').value = phone.stock;
    } else {
        formTitle.textContent = 'Ajouter Téléphone';
        currentPhoneId = null;
        formElement.reset();
    }
    
    form.style.display = 'block';
}

async function loadPhones() {
    try {
        await checkAdmin();
        
        const response = await fetch('/admin/phones', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur de chargement');
        
        const phones = await response.json();
        const tbody = document.querySelector('#phones-table tbody');
        
        tbody.innerHTML = phones.map(phone => `
            <tr>
                <td>${phone.id}</td>
                <td><img src="${phone.image}" alt="${phone.name}" style="width: 50px; height: 50px; object-fit: contain;"></td>
                <td>${phone.name}</td>
                <td>${phone.brand}</td>
                <td>${phone.price} DT</td>
                <td>${phone.stock}</td>
                <td>
                    <button class="btn btn-primary btn-sm me-2" onclick="showAddPhoneForm(${JSON.stringify(phone).replace(/"/g, '&quot;')})">
                        <i class="bi bi-pencil"></i> Modifier
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deletePhone(${phone.id})">
                        <i class="bi bi-trash"></i> Supprimer
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('danger', 'Erreur lors du chargement des téléphones');
    }
}

async function handlePhoneFormSubmit(e) {
    e.preventDefault();
    
    try {
        await checkAdmin();
        
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        const url = currentPhoneId ? `/admin/phones/${currentPhoneId}` : '/admin/phones';
        const method = currentPhoneId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Erreur d\'enregistrement');
        
        const result = await response.json();
        showAlert('success', currentPhoneId ? 'Téléphone modifié avec succès' : 'Téléphone ajouté avec succès');
        
        form.reset();
        document.getElementById('phoneForm').style.display = 'none';
        loadPhones();
        loadOverview();
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('danger', 'Erreur lors de l\'enregistrement du téléphone');
    }
}

async function deletePhone(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce téléphone ?')) return;
    
    try {
        await checkAdmin();
        
        const response = await fetch(`/admin/phones/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur de suppression');
        
        showAlert('success', 'Téléphone supprimé avec succès');
        loadPhones();
        loadOverview();
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('danger', 'Erreur lors de la suppression du téléphone');
    }
}

// Gestion des commandes
async function loadOrders() {
    try {
        await checkAdmin();
        
        const response = await fetch('/admin/orders', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur de chargement');
        
        const orders = await response.json();
        const tbody = document.querySelector('#orders-table tbody');
        
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>${order.id}</td>
                <td>${order.name}</td>
                <td>${order.email}</td>
                <td>${order.phone}</td>
                <td>${order.city}</td>
                <td>${order.total} DT</td>
                <td>
                    <span class="badge ${getStatusBadgeClass(order.status)}">
                        ${getStatusText(order.status)}
                    </span>
                </td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                    <select class="form-select form-select-sm" onchange="updateOrderStatus(${order.id}, this.value)" style="width: auto;">
                        <option value="">Changer...</option>
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>En attente</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>En cours</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Expédiée</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Livrée</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Annulée</option>
                    </select>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('danger', 'Erreur lors du chargement des commandes');
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'En attente',
        'processing': 'En cours',
        'shipped': 'Expédiée',
        'delivered': 'Livrée',
        'cancelled': 'Annulée'
    };
    return statusMap[status] || status;
}

function getStatusBadgeClass(status) {
    const classMap = {
        'pending': 'bg-secondary',
        'processing': 'bg-info text-dark',
        'shipped': 'bg-primary',
        'delivered': 'bg-success',
        'cancelled': 'bg-danger'
    };
    return classMap[status] || 'bg-secondary';
}

async function updateOrderStatus(id, status) {
    if (!status) return;
    
    try {
        await checkAdmin();
        
        const response = await fetch(`/admin/orders/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) throw new Error('Erreur de mise à jour');
        
        showAlert('success', 'Statut de commande mis à jour');
        loadOrders();
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('danger', 'Erreur lors de la mise à jour du statut');
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier l'authentification avant de charger quoi que ce soit
    checkAdmin()
        .then(() => {
            loadOverview();
            loadUsers();
            loadPhones();
            loadOrders();
            
            document.getElementById('addEditPhoneForm').addEventListener('submit', handlePhoneFormSubmit);
        })
        .catch(() => {
            // Redirection vers le login gérée par checkAdmin
        });
});