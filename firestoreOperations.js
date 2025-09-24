  // firestoreOperations.js
  import { db, auth } from './firebaseConfig';
  import { collection, addDoc } from "firebase/firestore";

  async function addOrder(orderData) {
    try {
      // Check if user is authenticated
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      const docRef = await addDoc(collection(db, "orders"), orderData);
      console.log("Order added with ID: ", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error adding order: ", error);
      throw error;
    }
  }

  export { addOrder };
  