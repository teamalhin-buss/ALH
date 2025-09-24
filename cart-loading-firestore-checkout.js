        function loadCartData() {
            console.log('🔍 Loading cart data from Firestore...');

            // Try multiple methods to get cart data
            const urlParams = new URLSearchParams(window.location.search);
            const cartParam = urlParams.get('cart');

            try {
                if (cartParam) {
                    console.log('📦 Found cart data in URL parameters');
                    currentCart = JSON.parse(decodeURIComponent(cartParam));
                    console.log('✅ Cart loaded from URL:', currentCart.length, 'items');
                } else {
                    console.log('📦 No cart data in URL, loading from Firestore');

                    // Load from Firestore using cart ID
                    const cartId = localStorage.getItem('alh_cart_id');
                    if (cartId) {
                        // For now, fallback to localStorage until Firestore is fully implemented
                        const cartData = localStorage.getItem('alh_cart');
                        if (cartData && cartData !== 'undefined' && cartData !== 'null' && cartData !== '[]') {
                            currentCart = JSON.parse(cartData);
                            console.log('✅ Cart loaded from localStorage:', currentCart.length, 'items');
                        } else {
                            console.log('⚠️ No valid cart data found');
                            currentCart = [];
                        }
                    } else {
                        console.log('⚠️ No cart ID found');
                        currentCart = [];
                    }
                }

                // Update localStorage with current cart
                localStorage.setItem('alh_cart', JSON.stringify(currentCart));

                // Render the order summary
                renderOrderSummary(currentCart);
                updateCartCount(currentCart);

            } catch (error) {
                console.error('❌ Error loading cart data:', error);
                showNotification('Error loading cart data. Please try again.', 'error');
                currentCart = [];
            }
        }
