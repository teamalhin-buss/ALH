console.log('Cart script loaded');

class ShoppingCart {
    constructor() {
        console.log('Initializing shopping cart...');
        try {
            const cartData = localStorage.getItem('alh_cart');
            this.cart = cartData ? JSON.parse(cartData) : [];
            console.log('Loaded cart from localStorage:', this.cart);
            this.setupEventListeners();
            this.updateCartCount();
            // Initial render
            this.renderCart();
        } catch (error) {
            console.error('Error initializing cart:', error);
            this.cart = [];
            localStorage.setItem('alh_cart', JSON.stringify([]));
        }
    }

    setupEventListeners() {
        // Toggle cart modal
        document.getElementById('cartBtn')?.addEventListener('click', () => this.toggleCart());
        document.getElementById('closeCart')?.addEventListener('click', () => this.toggleCart());
        
        // Close cart when clicking outside
        document.getElementById('cartModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('cartModal')) {
                this.toggleCart();
            }
        });

        // Add to cart buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart')) {
                const productCard = e.target.closest('.product-card');
                this.addToCart({
                    id: productCard.dataset.id,
                    name: productCard.dataset.name,
                    price: parseFloat(productCard.dataset.price),
                    image: productCard.dataset.image
                });
            }
        });
    }

    addToCart(product) {
        console.log('Adding product to cart:', product);
        try {
            const existingItem = this.cart.find(item => item.id === product.id);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                this.cart.push({...product, quantity: 1});
            }
            
            this.saveCart();
            this.showNotification('Item added to cart');
            console.log('Updated cart:', this.cart);
        } catch (error) {
            console.error('Error adding to cart:', error);
        }
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.renderCart();
    }

    updateQuantity(productId, newQuantity) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity = Math.max(1, newQuantity);
            this.saveCart();
            this.renderCart();
        }
    }

    saveCart() {
        localStorage.setItem('alh_cart', JSON.stringify(this.cart));
        this.updateCartCount();
    }

    updateCartCount() {
        const count = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = count;
            count > 0 
                ? cartCount.classList.remove('hidden')
                : cartCount.classList.add('hidden');
        }
    }

    renderCart() {
        console.log('Rendering cart...');
        const cartItems = document.getElementById('cartItems');
        const emptyCartMessage = document.getElementById('emptyCartMessage');
        
        if (!cartItems) {
            console.error('cartItems element not found!');
            return;
        }

        // Check if cart is empty
        if (!Array.isArray(this.cart) || this.cart.length === 0) {
            console.log('Cart is empty');
            cartItems.innerHTML = '';
            if (emptyCartMessage) {
                cartItems.appendChild(emptyCartMessage);
            } else {
                cartItems.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="ri-shopping-cart-line text-3xl mb-2"></i><p>Your cart is empty</p></div>';
            }
            if (document.getElementById('cartSubtotal')) {
                document.getElementById('cartSubtotal').textContent = '₹0.00';
                document.getElementById('cartTotal').textContent = '₹0.00';
            }
            return;
        }

        emptyCartMessage.remove();
        
        // Calculate totals
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = subtotal; // Add tax/shipping if needed

        document.getElementById('cartSubtotal').textContent = `₹${subtotal.toFixed(2)}`;
        document.getElementById('cartTotal').textContent = `₹${total.toFixed(2)}`;

        // Render cart items
        cartItems.innerHTML = this.cart.map(item => `
            <div class="flex items-start p-3 border rounded-lg" data-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded">
                <div class="ml-3 flex-1">
                    <h4 class="font-medium">${item.name}</h4>
                    <p class="text-primary font-semibold">₹${item.price.toFixed(2)}</p>
                    <div class="flex items-center mt-1">
                        <button class="quantity-btn w-6 h-6 flex items-center justify-center border rounded" data-action="decrease" data-id="${item.id}">-</button>
                        <span class="mx-2 w-8 text-center">${item.quantity}</span>
                        <button class="quantity-btn w-6 h-6 flex items-center justify-center border rounded" data-action="increase" data-id="${item.id}">+</button>
                    </div>
                </div>
                <button class="remove-btn text-gray-400 hover:text-red-500" data-id="${item.id}">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
        `).join('');

        // Add event listeners to dynamic elements
        document.querySelectorAll('.quantity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('button').dataset.id;
                const action = e.target.closest('button').dataset.action;
                const item = this.cart.find(i => i.id === productId);
                
                if (item) {
                    if (action === 'increase') {
                        this.updateQuantity(productId, item.quantity + 1);
                    } else {
                        this.updateQuantity(productId, item.quantity - 1);
                    }
                }
            });
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('button').dataset.id;
                this.removeFromCart(productId);
            });
        });
    }

    toggleCart() {
        const modal = document.getElementById('cartModal');
        if (modal) {
            modal.classList.toggle('hidden');
            if (!modal.classList.contains('hidden')) {
                this.renderCart();
            }
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-primary text-white px-4 py-2 rounded shadow-lg transform translate-x-full transition-transform';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the shopping cart when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing cart...');
    window.shoppingCart = new ShoppingCart();
    
    // Try to render the cart immediately
    setTimeout(() => {
        console.log('Initial cart render attempt...');
        if (window.shoppingCart) {
            window.shoppingCart.renderCart();
        }
    }, 500);
});
