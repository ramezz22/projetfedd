// Fonctions utilitaires
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('active');
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
        // Fermer les autres modals
        document.querySelectorAll('.modal').forEach(m => {
            if (m.id !== modalId) {
                closeModal(m.id);
            }
        });
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Ajoutez ce gestionnaire pour fermer les modals en cliquant à l'extérieur
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    initModals();
    loadPhones();
    setupBrandNavigation();
    setupNavigationButtons();
    checkAuthStatus();
    initCartEvents();
    setupContactForm();
    setupCheckoutSteps();

    window.cartSystem = new Cart();
});

/* MODALS */
function initModals() {
    // Gestion de l'ouverture
    document.getElementById('login-button')?.addEventListener('click', () => openModal('login-modal'));
    document.getElementById('cart-button')?.addEventListener('click', () => openModal('cart-modal'));

    // Gestion de la fermeture
    document.getElementById('close-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('login-modal');
    });
    
    document.getElementById('close-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('register-modal');
    });
    
    document.getElementById('close-cart')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('cart-modal');
    });
    
    document.getElementById('close-checkout')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('checkout-modal');
    });
    // Navigation entre login/register
    document.getElementById('show-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('login-modal');
        openModal('register-modal');
    });

    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('register-modal');
        openModal('login-modal');
    });
}

/* PHONES */
async function loadPhones() {
    try {
        const response = await fetch('http://localhost:3000/phones');
        const { success, data } = await response.json();
        
        if (success) {
            renderPhonesByBrand(data);
            initAddToCartButtons();
        }
    } catch (error) {
        console.error("Erreur chargement téléphones:", error);
    }
}

function renderPhonesByBrand(phones) {
    const brands = {
        apple: 'apple-phones-list',
        samsung: 'samsung-phones-list',
        huawei: 'huawei-phones-list',
        xiaomi: 'xiaomi-phones-list'
    };

    Object.entries(brands).forEach(([brand, containerId]) => {
        const container = document.getElementById(containerId);
        if (container) {
            const brandPhones = phones.filter(phone => phone.brand === brand);
            container.innerHTML = brandPhones.map(renderPhoneCard).join('');
        }
    });
}

function renderPhoneCard(phone) {
    return `
        <div class="card">
            <div class="h-64 bg-gray-100 flex items-center justify-center p-4">
                <img src="${phone.image}" alt="${phone.name}" class="h-full object-contain">
            </div>
            <div class="p-6">
                <h4 class="text-xl font-semibold text-gray-800">${phone.name}</h4>
                <div class="flex justify-between items-center mt-4">
                    <span class="text-2xl font-bold text-gray-800">${phone.price} TND</span>
                    <button class="add-to-cart button-primary" 
                            data-id="${phone.id}" 
                            data-name="${phone.name}" 
                            data-price="${phone.price}">
                        <i class="fas fa-cart-plus mr-2"></i>Ajouter
                    </button>
                </div>
            </div>
        </div>
    `;
}

/* NAVIGATION */
function setupBrandNavigation() {
    document.querySelectorAll('.brand-card').forEach(card => {
        card.addEventListener('click', function() {
            const brand = this.getAttribute('data-brand');
            showBrandPhones(brand);
        });
    });
}

function showBrandPhones(brand) {
    document.querySelectorAll('.phone-listing').forEach(div => {
        div.classList.add('hidden');
    });
    
    const targetSection = document.getElementById(`${brand}-phones`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function setupNavigationButtons() {
    // Bouton "Explorer les marques"
    const exploreBtn = document.querySelector('a[href="#brands"]');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('brands').scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        });
    }

    // Bouton "Voir tous les téléphones"
    const phonesBtn = document.querySelector('a[href="#phones"]');
    if (phonesBtn) {
        phonesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('phones').scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
        });
            
            document.querySelectorAll('.phone-listing').forEach(div => {
                div.classList.remove('hidden');
            });
        });
    }
}

/* AUTH */
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));
    const loginButton = document.getElementById('login-button');

    if (token && user && loginButton) {
        loginButton.innerHTML = `<i class="fas fa-user-check mr-2"></i>${user.name}`;
    }
}

/* CART */
function initCartEvents() {
    document.getElementById('clear-cart')?.addEventListener('click', () => {
        window.clearCart?.();
    });
    
    document.getElementById('checkout-button')?.addEventListener('click', () => {
        window.checkout?.();
    });
}

function initAddToCartButtons() {
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const name = this.getAttribute('data-name');
            const price = parseInt(this.getAttribute('data-price'));
            
            if (typeof window.addToCart === 'function') {
                window.addToCart(id, name, price);
                openModal('cart-modal');
            }
        });
    });
}

/* CONTACT */
function setupContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('contact-name').value,
                email: document.getElementById('contact-email').value,
                subject: document.getElementById('contact-subject').value,
                message: document.getElementById('contact-message').value
            };
            
            try {
                const response = await fetch('http://localhost:3000/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('Message envoyé avec succès!');
                    contactForm.reset();
                } else {
                    alert('Erreur lors de l\'envoi du message');
                }
            } catch (error) {
                console.error('Erreur:', error);
                alert('Erreur lors de l\'envoi du message');
            }
        });
    }
}

/* CHECKOUT */
function setupCheckoutSteps() {
    // Étape 1 -> Étape 2 (Vers livraison)
    document.getElementById('proceed-to-shipping')?.addEventListener('click', (e) => {
        e.preventDefault();
        showCheckoutStep('checkout-step-shipping');
        prefillShippingForm();
    });

    // Étape 2 -> Étape 1 (Retour)
    document.getElementById('back-to-summary')?.addEventListener('click', (e) => {
        e.preventDefault();
        showCheckoutStep('checkout-step-summary');
    });

    // Étape 2 -> Étape 3 (Vers paiement)
    document.getElementById('proceed-to-payment')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (validateShippingForm()) {
            showCheckoutStep('checkout-step-payment');
        }
    });

    // Étape 3 -> Étape 2 (Retour)
    document.getElementById('back-to-shipping')?.addEventListener('click', (e) => {
        e.preventDefault();
        showCheckoutStep('checkout-step-shipping');
    });

    // Soumission du formulaire de paiement
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            processPayment();
        });
    }

    // Toggle les détails de la carte
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const cardDetails = document.getElementById('card-details');
            if (e.target.value === 'card') {
                cardDetails?.classList.remove('hidden');
            } else {
                cardDetails?.classList.add('hidden');
            }
        });
    });
}

function showCheckoutStep(stepId) {
    document.querySelectorAll('.checkout-step').forEach(step => {
        step.classList.add('hidden');
        step.classList.remove('active');
    });
    
    const step = document.getElementById(stepId);
    if (step) {
        step.classList.remove('hidden');
        step.classList.add('active');
    }
}

function prefillShippingForm() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        const names = user.name.split(' ');
        const firstName = names[0] || '';
        const lastName = names.slice(1).join(' ') || '';
        
        document.getElementById('shipping-firstname').value = firstName;
        document.getElementById('shipping-lastname').value = lastName;
    }
}

function validateShippingForm() {
    const requiredFields = [
        'shipping-firstname',
        'shipping-lastname',
        'shipping-address',
        'shipping-zip',
        'shipping-city',
        'shipping-phone'
    ];

    let isValid = true;

    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.classList.add('border-red-500');
            isValid = false;
        } else {
            field.classList.remove('border-red-500');
        }
    });

    if (!isValid) {
        alert('Veuillez remplir tous les champs obligatoires');
        return false;
    }

    return true;
}

processPayment()
function validateCardPayment() {
    const cardNumber = document.getElementById('card-number').value;
    const cardExpiry = document.getElementById('card-expiry').value;
    const cardCvc = document.getElementById('card-cvc').value;

    if (!cardNumber || !cardExpiry || !cardCvc) {
        alert('Veuillez remplir tous les détails de la carte');
        return false;
    }

    const [month, year] = cardExpiry.split('/');
    if (!month || !year || month.length !== 2 || year.length !== 2) {
        alert('Format de date d\'expiration invalide. Utilisez MM/AA');
        return false;
    }

    return true;
    
}

async function submitOrder(orderData) {
    try {
        const token = localStorage.getItem('authToken');
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!user?.id) {
            alert('Connectez-vous pour commander');
            return;
        }

        const response = await fetch('http://localhost:3000/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Erreur de commande');
        }

        if (data.success) {
            alert(`Commande #${data.orderId} confirmée !`);
            window.cartSystem.clearCart();
            closeModal('checkout-modal');
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert(`Échec de la commande: ${error.message}`);
    }
}

function processPayment() {
    if (!window.cartSystem?.cart.length) {
        alert('Votre panier est vide');
        return;
    }

    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
    if (!paymentMethod) {
        alert('Sélectionnez un mode de paiement');
        return;
    }

    // Validation paiement carte
    let cardDetails = null;
    if (paymentMethod === 'card') {
        const cardNumber = document.getElementById('card-number').value;
        const cardExpiry = document.getElementById('card-expiry').value;
        const cardCvc = document.getElementById('card-cvc').value;
        
        if (!cardNumber || !cardExpiry || !cardCvc) {
            alert('Renseignez les infos de carte');
            return;
        }
        
        cardDetails = { number: cardNumber, expiry: cardExpiry, cvc: cardCvc };
    }

    // Récupération infos livraison
    const shippingData = {
        shippingFirstname: getValue('shipping-firstname'),
        shippingLastname: getValue('shipping-lastname'),
        shippingAddress: getValue('shipping-address'),
        shippingCity: getValue('shipping-city'),
        shippingZip: getValue('shipping-zip'),
        shippingCountry: getValue('shipping-country') || 'Tunisie',
        shippingPhone: getValue('shipping-phone'),
        shippingNotes: getValue('shipping-notes')
    };

    // Validation champs requis
    const requiredFields = [
        'shipping-firstname', 'shipping-lastname',
        'shipping-address', 'shipping-city',
        'shipping-zip', 'shipping-phone'
    ];
    
    for (const fieldId of requiredFields) {
        if (!getValue(fieldId)) {
            alert('Remplissez tous les champs obligatoires');
            return;
        }
    }

    // Envoi de la commande
    submitOrder({
        items: window.cartSystem.cart,
        total: window.getCartTotal(),
        shipping: shippingData,
        paymentMethod,
        card: cardDetails
    });
}

// Helper function
function getValue(id) {
    return document.getElementById(id)?.value.trim() || '';
}