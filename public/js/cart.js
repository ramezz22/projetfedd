// cart.js - Version finale corrigée
class Cart {
  constructor() {
    this.cart = JSON.parse(localStorage.getItem('cart')) || [];
    this.initCart();
  }

  initCart() {
    this.updateCart();
    window.addToCart = this.addToCart.bind(this);
    window.clearCart = this.clearCart.bind(this);
  }

  safePrice(price) {
    const num = Number(price);
    return isNaN(num) ? 0 : num;
  }

  addToCart(id, name, price, brand) {
    const safePrice = this.safePrice(price);
    const existingItem = this.cart.find(item => item.id === id);
    
    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.cart.push({
        id,
        name,
        price: safePrice,
        brand,
        quantity: 1
      });
    }
    
    this.updateCart();
    this.showNotification(name);
  }

  updateCart() {
    // Sauvegarde dans localStorage
    localStorage.setItem('cart', JSON.stringify(this.cart));
    
    // Mise à jour du compteur
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
      const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
      cartCount.textContent = totalItems;
      cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    
    // Mise à jour du modal
    this.renderCartItems();
  }

  renderCartItems() {
    const container = document.getElementById('cart-items');
    if (!container) return;
    
    if (this.cart.length === 0) {
      container.innerHTML = '<div class="py-4 text-center text-gray-500 italic">Votre panier est vide</div>';
    } else {
      container.innerHTML = this.cart.map(item => `
        <div class="cart-item flex items-center justify-between py-4 border-b">
          <div class="flex-1">
            <h4 class="text-gray-800 font-medium">${item.name}</h4>
            <div class="text-sm text-gray-500">${this.safePrice(item.price).toFixed(2)} TND</div>
          </div>
          <div class="flex items-center">
            <button class="decrease-quantity px-2 py-1 border rounded-l hover:bg-gray-100" data-id="${item.id}">-</button>
            <span class="px-4 py-1 border-t border-b">${item.quantity}</span>
            <button class="increase-quantity px-2 py-1 border rounded-r hover:bg-gray-100" data-id="${item.id}">+</button>
          </div>
          <div class="ml-4 text-right">
            <div class="text-gray-800 font-medium">${(this.safePrice(item.price) * item.quantity).toFixed(2)} TND</div>
            <button class="remove-item text-red-500 text-sm hover:text-red-700" data-id="${item.id}">
              <i class="fas fa-trash mr-1"></i>Supprimer
            </button>
          </div>
        </div>
      `).join('');
      
      this.setupCartEvents();
    }
    
    // Mise à jour du total
    const total = this.cart.reduce((sum, item) => sum + (this.safePrice(item.price) * item.quantity), 0);
    const totalElement = document.getElementById('cart-total');
    if (totalElement) totalElement.textContent = `${total.toFixed(2)} TND`;
  }

  setupCartEvents() {
    document.querySelectorAll('.decrease-quantity').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = this.cart.find(i => i.id === id);
        if (item.quantity > 1) {
          item.quantity--;
        } else {
          this.cart = this.cart.filter(i => i.id !== id);
        }
        this.updateCart();
      });
    });
    
    document.querySelectorAll('.increase-quantity').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = this.cart.find(i => i.id === id);
        item.quantity++;
        this.updateCart();
      });
    });
    
    document.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        this.cart = this.cart.filter(i => i.id !== id);
        this.updateCart();
      });
    });
  }

  clearCart() {
    this.cart = [];
    this.updateCart();
  }

  showNotification(productName) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg flex items-center animate-fade-in';
    notification.innerHTML = `
      <i class="fas fa-check-circle mr-2"></i>
      ${productName} ajouté au panier
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('opacity-0', 'transition-opacity', 'duration-300');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }
}

// Initialisation automatique
const cartSystem = new Cart();
window.getCartTotal = () => {
  return cartSystem.cart.reduce((total, item) => total + (cartSystem.safePrice(item.price) * item.quantity), 0);
};

window.checkout = function() {
    if (cartSystem.cart.length === 0) {
        alert('Votre panier est vide');
        return;
    }
    
    // Mettre à jour les éléments du checkout
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total');
    const paymentTotal = document.getElementById('payment-total');
    
    if (checkoutItems && checkoutTotal && paymentTotal) {
        checkoutItems.innerHTML = cartSystem.cart.map(item => `
            <div class="flex justify-between py-2">
                <span>${item.name} x${item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)} TND</span>
            </div>
        `).join('');
        
        const total = cartSystem.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        checkoutTotal.textContent = total.toFixed(2) + ' TND';
        paymentTotal.textContent = total.toFixed(2) + ' TND';
        
        closeModal('cart-modal');
        openModal('checkout-modal');
    }
};