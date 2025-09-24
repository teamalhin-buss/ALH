import { db } from './firebase-config.js';
import {
    doc, getDoc, setDoc, updateDoc, deleteDoc,
    collection, query, where, getDocs,
    addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

class FirestoreCartManager {
    constructor() {
        this.cartId = this.getOrCreateCartId();
        this.cartRef = doc(db, 'carts', this.cartId);
        this.itemsRef = collection(db, 'cartItems');
        console.log('🛒 FirestoreCartManager initialized with ID:', this.cartId);
    }

    // Generate or get existing cart ID
    getOrCreateCartId() {
        let cartId = localStorage.getItem('alh_cart_id');
        if (!cartId) {
            cartId = 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('alh_cart_id', cartId);
        }
        return cartId;
    }

    // Load cart data from Firestore
    async loadCart() {
        try {
            console.log('🔍 Loading cart from Firestore...');
            const cartDoc = await getDoc(this.cartRef);

            if (cartDoc.exists()) {
                const cartData = cartDoc.data();
                console.log('✅ Cart loaded from Firestore:', cartData.items.length, 'items');

                // Also load individual items for detailed data
                const itemsQuery = query(this.itemsRef, where('cartId', '==', this.cartId));
                const itemsSnapshot = await getDocs(itemsQuery);

                const items = [];
                itemsSnapshot.forEach((doc) => {
                    items.push({ id: doc.id, ...doc.data() });
                });

                console.log('✅ Cart items loaded:', items.length, 'items');
                return items;
            } else {
                console.log('⚠️ No cart found in Firestore, creating new one');
                await this.initializeCart();
                return [];
            }
        } catch (error) {
            console.error('❌ Error loading cart from Firestore:', error);
            // Fallback to localStorage
            return this.loadFromLocalStorage();
        }
    }

    // Initialize empty cart in Firestore
    async initializeCart() {
        try {
            await setDoc(this.cartRef, {
                cartId: this.cartId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                itemCount: 0,
                totalAmount: 0
            });
            console.log('✅ Empty cart initialized in Firestore');
        } catch (error) {
            console.error('❌ Error initializing cart:', error);
        }
    }

    // Add item to cart
    async addItem(product) {
        try {
            console.log('➕ Adding item to Firestore cart:', product);

            // Check if item already exists
            const existingItemQuery = query(
                this.itemsRef,
                where('cartId', '==', this.cartId),
                where('productId', '==', product.id)
            );
            const existingItems = await getDocs(existingItemQuery);

            if (!existingItems.empty) {
                // Update existing item quantity
                const existingDoc = existingItems.docs[0];
                const existingData = existingDoc.data();
                const newQuantity = existingData.quantity + 1;

                await updateDoc(existingDoc.ref, {
                    quantity: newQuantity,
                    updatedAt: serverTimestamp()
                });

                console.log('✅ Updated existing item quantity to:', newQuantity);
            } else {
                // Add new item
                await addDoc(this.itemsRef, {
                    cartId: this.cartId,
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    quantity: 1,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                console.log('✅ Added new item to cart');
            }

            // Update cart summary
            await this.updateCartSummary();

            return true;
        } catch (error) {
            console.error('❌ Error adding item to cart:', error);
            return false;
        }
    }

    // Update item quantity
    async updateItemQuantity(productId, newQuantity) {
        try {
            if (newQuantity <= 0) {
                return await this.removeItem(productId);
            }

            const itemQuery = query(
                this.itemsRef,
                where('cartId', '==', this.cartId),
                where('productId', '==', productId)
            );
            const itemDocs = await getDocs(itemQuery);

            if (!itemDocs.empty) {
                const itemDoc = itemDocs.docs[0];
                await updateDoc(itemDoc.ref, {
                    quantity: newQuantity,
                    updatedAt: serverTimestamp()
                });

                await this.updateCartSummary();
                console.log('✅ Updated item quantity to:', newQuantity);
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Error updating item quantity:', error);
            return false;
        }
    }

    // Remove item from cart
    async removeItem(productId) {
        try {
            const itemQuery = query(
                this.itemsRef,
                where('cartId', '==', this.cartId),
                where('productId', '==', productId)
            );
            const itemDocs = await getDocs(itemQuery);

            if (!itemDocs.empty) {
                const itemDoc = itemDocs.docs[0];
                await deleteDoc(itemDoc.ref);
                await this.updateCartSummary();
                console.log('✅ Removed item from cart');
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Error removing item from cart:', error);
            return false;
        }
    }

    // Clear entire cart
    async clearCart() {
        try {
            // Delete all items for this cart
            const itemsQuery = query(this.itemsRef, where('cartId', '==', this.cartId));
            const itemsSnapshot = await getDocs(itemsQuery);

            const deletePromises = [];
            itemsSnapshot.forEach((doc) => {
                deletePromises.push(deleteDoc(doc.ref));
            });

            await Promise.all(deletePromises);

            // Reset cart summary
            await updateDoc(this.cartRef, {
                itemCount: 0,
                totalAmount: 0,
                updatedAt: serverTimestamp()
            });

            console.log('✅ Cart cleared from Firestore');
            return true;
        } catch (error) {
            console.error('❌ Error clearing cart:', error);
            return false;
        }
    }

    // Update cart summary
    async updateCartSummary() {
        try {
            const itemsQuery = query(this.itemsRef, where('cartId', '==', this.cartId));
            const itemsSnapshot = await getDocs(itemsQuery);

            let itemCount = 0;
            let totalAmount = 0;

            itemsSnapshot.forEach((doc) => {
                const item = doc.data();
                itemCount += item.quantity;
                totalAmount += item.price * item.quantity;
            });

            await updateDoc(this.cartRef, {
                itemCount: itemCount,
                totalAmount: totalAmount,
                updatedAt: serverTimestamp()
            });

            console.log('✅ Cart summary updated:', { itemCount, totalAmount });
        } catch (error) {
            console.error('❌ Error updating cart summary:', error);
        }
    }

    // Get cart items for checkout
    async getCartItems() {
        try {
            const itemsQuery = query(this.itemsRef, where('cartId', '==', this.cartId));
            const itemsSnapshot = await getDocs(itemsQuery);

            const items = [];
            itemsSnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });

            return items;
        } catch (error) {
            console.error('❌ Error getting cart items:', error);
            return [];
        }
    }

    // Fallback to localStorage if Firestore fails
    loadFromLocalStorage() {
        try {
            const cartData = localStorage.getItem('alh_cart');
            if (cartData && cartData !== '[]') {
                const items = JSON.parse(cartData);
                console.log('✅ Loaded from localStorage fallback:', items.length, 'items');
                return items;
            }
        } catch (error) {
            console.error('❌ Error loading from localStorage:', error);
        }
        return [];
    }

    // Sync localStorage with Firestore
    async syncWithLocalStorage() {
        try {
            const items = await this.getCartItems();
            localStorage.setItem('alh_cart', JSON.stringify(items));
            console.log('✅ Synced localStorage with Firestore');
        } catch (error) {
            console.error('❌ Error syncing with localStorage:', error);
        }
    }
}

// Export for use in other files
export { FirestoreCartManager };
