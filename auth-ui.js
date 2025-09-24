// auth-ui.js
import { login, register, logout, onAuthStateChanged, signInWithGoogle } from './alh-firebase.js';
import { db, auth } from './firebaseConfig.js';
import { collection, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const accountBtn  = document.getElementById('accountBtn');
const loginModal  = document.getElementById('loginModal');
const loginForm   = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabLogin    = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const switchBtn   = document.getElementById('switchForm');
const closeBtn    = document.getElementById('closeLoginModal');

/* toggle forms */
const showLogin = () => {
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
  tabLogin.classList.add('border-primary', 'text-primary');
  tabRegister.classList.remove('border-primary', 'text-primary');
  switchBtn.textContent = 'Sign up';
  document.getElementById('switchPrompt').textContent = "Don't have an account?";
};
const showRegister = () => {
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
  tabLogin.classList.remove('border-primary', 'text-primary');
  tabRegister.classList.add('border-primary', 'text-primary');
  switchBtn.textContent = 'Login';
  document.getElementById('switchPrompt').textContent = "Already have an account?";
};

/* open / close */
accountBtn.onclick = () => loginModal.classList.remove('hidden');
closeBtn.onclick   = () => loginModal.classList.add('hidden');
tabLogin.onclick   = showLogin;
tabRegister.onclick = showRegister;
switchBtn.onclick  = () => (loginForm.classList.contains('hidden') ? showLogin() : showRegister());

/* login */
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = e.target.email.value;
  const password = e.target.password.value;
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Logging in...';
  
  try {
    const userCredential = await login(email, password);
    const user = userCredential.user;
    
    // Update Firestore user document
    try {
      await setDoc(doc(db, 'users', user.uid), {
        emailVerified: true,
        status: 'active'
      }, { merge: true });
    } catch (firestoreError) {
      console.error('Error updating user document in Firestore:', firestoreError);
    }
    
    loginModal.classList.add('hidden');
  } catch (err) {
    alert('Login: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
});

/* register */
registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = e.target.email.value;
  const password = e.target.password.value;
  
  // Validate email
  if (!validateEmail(email)) {
    alert('Please enter a valid email address');
    return;
  }
  
  const submitBtn = registerForm.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Creating account...';
  
  try {
    // Register user in Firebase Authentication
    const userCredential = await register(email, password);
    const user = userCredential.user;
    
    // Also create user document in Firestore
    try {
      await setDoc(doc(db, 'users', user.uid), {
        name: email.split('@')[0], // Use part of email as name
        email: email,
        role: 'user',
        status: 'active',
        emailVerified: true,
        createdAt: serverTimestamp()
      });
    } catch (firestoreError) {
      console.error('Error creating user document in Firestore:', firestoreError);
    }
    
    alert('Account created successfully!');
    showLogin(); // Switch to login form
  } catch (err) {
    alert('Register: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
});

/* Google login */
const handleGoogleLogin = async () => {
  const googleLoginBtn = document.getElementById('googleLogin');
  const originalBtnText = googleLoginBtn.innerHTML;
  
  googleLoginBtn.disabled = true;
  googleLoginBtn.innerHTML = '<i class="ri-loader-4-line animate-spin mr-2"></i>Signing in...';
  
  try {
    const userCredential = await signInWithGoogle();
    const user = userCredential.user;
    
    // Create/update user document in Firestore
    try {
      await setDoc(doc(db, 'users', user.uid), {
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        photoURL: user.photoURL || null,
        role: 'user',
        status: 'active',
        emailVerified: user.emailVerified,
        provider: 'google',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      }, { merge: true });
    } catch (firestoreError) {
      console.error('Error creating/updating user document in Firestore:', firestoreError);
    }
    
    loginModal.classList.add('hidden');
  } catch (err) {
    console.error('Google login error:', err);
    alert('Google Login: ' + (err.message || 'An error occurred during Google sign-in'));
  } finally {
    googleLoginBtn.disabled = false;
    googleLoginBtn.innerHTML = originalBtnText;
  }
};

// Add event listener for Google login button
document.addEventListener('DOMContentLoaded', () => {
  const googleLoginBtn = document.getElementById('googleLogin');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', handleGoogleLogin);
  }
});

/* logout on click when already logged in */
onAuthStateChanged(auth, async user => {
  if (user) {
    accountBtn.innerHTML = `<span class="text-sm">${user.email.split('@')[0]}</span>`;
    accountBtn.onclick = () => logout();
    
    // Update Firestore user document
    try {
      await setDoc(doc(db, 'users', user.uid), {
        emailVerified: true,
        status: 'active'
      }, { merge: true });
    } catch (firestoreError) {
      console.error('Error updating user document in Firestore:', firestoreError);
    }
  } else {
    accountBtn.innerHTML = '<i class="ri-user-line ri-xl"></i>';
    accountBtn.onclick = () => { showLogin(); loginModal.classList.remove('hidden'); };
  }
});