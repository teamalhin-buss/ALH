// Add checkout button event listener
document.addEventListener('DOMContentLoaded', function() {
    // Wait for cart to be initialized
    setTimeout(() => {
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn && window.shoppingCart) {
            checkoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                window.shoppingCart.proceedToCheckout();
            });
            console.log('✅ Checkout button event listener added');
        } else {
            console.warn('⚠️ Checkout button or cart not found');
        }
    }, 1000);
});
