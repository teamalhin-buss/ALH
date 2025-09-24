  // storageOperations.js
  import { storage, auth } from './firebaseConfig';
  import { ref, uploadBytes } from "firebase/storage";

  async function uploadFile(file) {
    try {
      // Check if user is authenticated
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      const storageRef = ref(storage, 'uploads/' + file.name);
      const snapshot = await uploadBytes(storageRef, file);
      console.log('Uploaded a file!', snapshot);
      return snapshot;
    } catch (error) {
      console.error("Error uploading file: ", error);
      throw error;
    }
  }

  export { uploadFile };
  