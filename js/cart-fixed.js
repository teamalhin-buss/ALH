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
        console.log('Setting up event listeners...');
        // Toggle cart modal
        const cartBtn = document.getElementById('cartBtn');
        const closeCart = document.getElementById('closeCart');
        const cartModal = document.getElementById('cartModal');
        
        if (cartBtn) {
            cartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleCart();
            });
        } else {
            console.warn('Cart button not found');
        }
        
        if (closeCart) {
            closeCart.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleCart();
            });
        } else {
            console.warn('Close cart button not found');
        }
        
        if (cartModal) {
            cartModal.addEventListener('click', (e) => {
                if (e.target === cartModal) {
                    this.toggleCart();
                }
            });
        } else {
            console.warn('Cart modal not found');
        }

        // Add to cart buttons (delegated event)
        document.addEventListener('click', (e) => {
            const addToCartBtn = e.target.closest('.add-to-cart');
            if (addToCartBtn) {
                e.preventDefault();
                const productCard = addToCartBtn.closest('.product-card');
                if (productCard) {
                    this.addToCart({
                        id: productCard.dataset.id,
                        name: productCard.dataset.name,
                        price: parseFloat(productCard.dataset.price),
                        image: productCard.dataset.image
                    });
                }
            }
        });

        // Quantity and remove buttons (delegated events)
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]') || e.target.closest('.remove-btn');
            if (!target) return;

            const action = target.dataset.action || (target.classList.contains('remove-btn') ? 'remove' : null);
            const productId = target.dataset.id || target.closest('[data-id]')?.dataset.id;
            
            if (!action || !productId) return;

            e.preventDefault();

            switch (action) {
                case 'increase':
                    this.updateQuantity(productId, this.getProductQuantity(productId) + 1);
                    break;
                case 'decrease':
                    this.updateQuantity(productId, this.getProductQuantity(productId) - 1);
                    break;
                case 'remove':
                    this.removeFromCart(productId);
                    break;
            }
        });
    }

    getProductQuantity(productId) {
        const item = this.cart.find(item => item.id === productId);
        return item ? item.quantity : 0;
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
            if (newQuantity < 1) {
                this.removeFromCart(productId);
            } else {
                item.quantity = newQuantity;
                this.saveCart();
                this.renderCart();
            }
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
            cartCount.classList.toggle('hidden', count === 0);
        }
    }

    renderCart() {
        console.log('Rendering cart...');
        const cartItems = document.getElementById('cartItems');
        
        if (!cartItems) {
            console.error('Cart items container not found!');
            return;
        }

        // Check if cart is empty or invalid
        if (!Array.isArray(this.cart) || this.cart.length === 0) {
            console.log('Cart is empty or invalid');
            cartItems.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="ri-shopping-cart-line text-3xl mb-2"></i>
                    <p>Your cart is empty</p>
                </div>
            `;
            
            if (document.getElementById('cartSubtotal')) {
                document.getElementById('cartSubtotal').textContent = '₹0.00';
                document.getElementById('cartTotal').textContent = '₹0.00';
            }
            return;
        }

        // Calculate totals
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = subtotal; // Add tax/shipping if needed

        // Update totals
        if (document.getElementById('cartSubtotal')) {
            document.getElementById('cartSubtotal').textContent = `₹${subtotal.toFixed(2)}`;
            document.getElementById('cartTotal').textContent = `₹${total.toFixed(2)}`;
        }

        // Render cart items
        cartItems.innerHTML = this.cart.map(item => `
            <div class="flex items-start p-3 border-b" data-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded mr-3">
                <div class="flex-1">
                    <h4 class="font-medium text-sm">${item.name}</h4>
                    <p class="text-primary font-semibold text-sm">₹${item.price.toFixed(2)}</p>
                    <div class="flex items-center mt-1">
                        <button class="quantity-btn w-6 h-6 flex items-center justify-center border rounded" data-action="decrease" data-id="${item.id}">-</button>
                        <span class="mx-2 w-8 text-center text-sm">${item.quantity}</span>
                        <button class="quantity-btn w-6 h-6 flex items-center justify-center border rounded" data-action="increase" data-id="${item.id}">+</button>
                    </div>
                </div>
                <button class="remove-btn text-gray-400 hover:text-red-500 ml-2" data-id="${item.id}">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
        `).join('');
    }

    toggleCart() {
        const cartModal = document.getElementById('cartModal');
        if (!cartModal) {
            console.error('Cart modal not found!');
            return;
        }
        
        const isHidden = cartModal.classList.contains('hidden');
        cartModal.classList.toggle('hidden', !isHidden);
        
        if (!isHidden) {
            this.renderCart();
        }
    }

    showNotification(message) {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.cart-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'cart-notification fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg transform translate-x-full transition-transform duration-300 z-50';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Trigger the animation
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the shopping cart when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing cart...');
    window.shoppingCart = new ShoppingCart();
    
    // Try to render the cart after a short delay
    setTimeout(() => {
        console.log('Initial cart render attempt...');
        if (window.shoppingCart) {
            window.shoppingCart.renderCart();
        }
    }, 500);
});
