document.addEventListener('DOMContentLoaded', function() {
  console.log('Checkout page loaded');
  
  // Get cart data from URL parameters or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const cartParam = urlParams.get('cart');
  
  let cart = [];
  
  try {
    // Try to get cart from URL first
    if (cartParam) {
      console.log('Found cart in URL parameters');
      cart = JSON.parse(decodeURIComponent(cartParam));
      console.log('Cart from URL:', cart);
      // Also update localStorage
      localStorage.setItem('alh_cart', JSON.stringify(cart));
    } else {
      console.log('No cart in URL, checking localStorage');
      // Fall back to localStorage
      const cartData = localStorage.getItem('alh_cart');
      console.log('Raw cart data from localStorage:', cartData);
      cart = cartData ? JSON.parse(cartData) : [];
    }
    
    console.log('Final cart data:', cart);
  } catch (e) {
    console.error('Error parsing cart data:', e);
    // Fall back to empty cart if there's an error
    cart = [];
  }
  const orderItems = document.getElementById('orderItems');
  const orderSubtotal = document.getElementById('orderSubtotal');
  const orderTotal = document.getElementById('orderTotal');
  const placeOrderBtn = document.getElementById('placeOrderBtn');
  const cartCount = document.getElementById('cartCount');
  
  // Update cart count in header
  function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = count;
    cartCount.classList.toggle('hidden', count === 0);
  }
  
  // Render order items
  function renderOrderItems() {
    if (cart.length === 0) {
      orderItems.innerHTML = '<p class="text-sm text-gray-500">Your cart is empty</p>';
      orderSubtotal.textContent = '₹0.00';
      orderTotal.textContent = '₹0.00';
      return;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal; // Add tax/shipping if needed
    
    orderSubtotal.textContent = `₹${subtotal.toFixed(2)}`;
    orderTotal.textContent = `₹${total.toFixed(2)}`;
    
    orderItems.innerHTML = cart.map(item => `
      <div class="flex items-start py-2 border-b">
        <img src="${item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded mr-3">
        <div class="flex-1">
          <h4 class="text-sm font-medium">${item.name}</h4>
          <div class="flex justify-between items-center text-sm text-gray-600">
            <span>Qty: ${item.quantity}</span>
            <span class="font-medium">₹${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }
  
  // Handle form submission
  placeOrderBtn.addEventListener('click', function() {
    const form = document.getElementById('checkoutForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    // In a real implementation, you would process the payment here
    // For now, we'll just show a success message
    alert('Order placed successfully!');
    
    // Clear the cart
    localStorage.removeItem('alh_cart');
    
    // Redirect to confirmation page
    window.location.href = '/order-confirmation/';
  });
  
  // Initialize the page
  updateCartCount();
  renderOrderItems();
});
