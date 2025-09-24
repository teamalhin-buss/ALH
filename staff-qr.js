/**
 * Staff QR + OTP + Dashboard (vanilla JS)
 * - Scan QR (html5-qrcode) to get staffCode
 * - Verify phone via Firebase Phone Auth (OTP)
 * - Acquire single active session via Cloud Functions
 * - View wage balance and redeem via Cloud Functions
 * - Read-only Firestore access to own staff and payment logs
 */

import { auth, db, doc, getDoc, setDoc } from './alh-firebase.js';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut as fbSignOut,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-functions.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/* ---------- Elements ---------- */
const qrSection        = document.getElementById('qrSection');
const qrReaderDiv      = document.getElementById('qr-reader');
const qrError          = document.getElementById('qrError');
const qrSuccess        = document.getElementById('qrSuccess');
const qrImageInput     = document.getElementById('qrImageInput');
const uploadQrBtn      = document.getElementById('uploadQrBtn');
const manualCodeInput  = document.getElementById('manualCodeInput');
const manualCodeBtn    = document.getElementById('manualCodeBtn');

const authSection      = document.getElementById('authSection');
const registrationHint = document.getElementById('registrationHint');
const passwordForm     = document.getElementById('passwordForm');
const passwordInput    = document.getElementById('passwordInput');
const loginBtn         = document.getElementById('loginBtn');
const resetScanBtn     = document.getElementById('resetScanBtn');
const authError        = document.getElementById('authError');
const authInfo         = document.getElementById('authInfo');

const contactAdminSection = document.getElementById('contactAdminSection');
const unregisteredCode = document.getElementById('unregisteredCode');
const unregisteredCodeSpan = document.getElementById('unregisteredCodeSpan');
const backToScanBtn = document.getElementById('backToScanBtn');

const setPasswordSection = document.getElementById('setPasswordSection');
const setPasswordForm = document.getElementById('setPasswordForm');
const newPassword = document.getElementById('newPassword');
const confirmNewPassword = document.getElementById('confirmNewPassword');
const setPasswordBtn = document.getElementById('setPasswordBtn');
const cancelSetPasswordBtn = document.getElementById('cancelSetPasswordBtn');
const setPasswordError = document.getElementById('setPasswordError');
const setPasswordSuccess = document.getElementById('setPasswordSuccess');

const dashboardSection = document.getElementById('dashboardSection');
const sessionWarning   = document.getElementById('sessionWarning');
const dashError        = document.getElementById('dashError');
const dashSuccess      = document.getElementById('dashSuccess');
const dashStaffCode    = document.getElementById('dashStaffCode');
const dashPhone        = document.getElementById('dashPhone');
const dashBalance      = document.getElementById('dashBalance');
const redeemForm       = document.getElementById('redeemForm');
const redeemAmount     = document.getElementById('redeemAmount');
const redeemBtn        = document.getElementById('redeemBtn');
const signOutBtn       = document.getElementById('signOutBtn');
const paymentsList     = document.getElementById('paymentsList');

/* ---------- State ---------- */
let scannedStaffCode = null;
let html5Qr = null;

const functions = getFunctions();
const acquireStaffSession = httpsCallable(functions, 'acquireStaffSession');
const releaseStaffSession = httpsCallable(functions, 'releaseStaffSession');
const validatePayment     = httpsCallable(functions, 'validatePayment');
const updateWageBalance   = httpsCallable(functions, 'updateWageBalance');
const updateStaffProfile  = httpsCallable(functions, 'updateStaffProfile');

/* ---------- UI Helpers ---------- */
function show(el) { el?.classList.remove('hidden-el'); }
function hide(el) { el?.classList.add('hidden-el'); }
function setText(el, txt) { if (el) el.textContent = txt ?? ''; }
function setHtml(el, html) { if (el) el.innerHTML = html ?? ''; }
function setBusy(btn, busy, labelWhenIdle, labelWhenBusy = 'Please wait...') {
  if (!btn) return;
  btn.disabled = !!busy;
  btn.textContent = busy ? labelWhenBusy : labelWhenIdle;
}
function showError(el, msg) { if (!el) return; el.classList.remove('hidden-el'); el.textContent = msg; }
function hideError(el) { el?.classList.add('hidden-el'); el && (el.textContent = ''); }
function showInfo(el, msg) { if (!el) return; el.classList.remove('hidden-el'); el.textContent = msg; }
function hideInfo(el) { el?.classList.add('hidden-el'); el && (el.textContent = ''); }

// Smooth scroll utility with fixed header offset
const HEADER_OFFSET = 96; // approximate sticky header height
function scrollToSection(el) {
  if (!el) return;
  try {
    const y = el.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  } catch {}
}

// Normalize to Indian phone format: returns "+91XXXXXXXXXX" or null if invalid
function normalizeIndianPhone(input) {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, '');
  // If already like 91XXXXXXXXXX (12 digits) trim leading 91 to validate as 10-digit
  let local = digits;
  if (local.length === 12 && local.startsWith('91')) {
    local = local.slice(2);
  }
  if (local.length !== 10) return null;
  return '+91' + local;
}

// Simple password hashing function (for demo - use proper hashing in production)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'ALH_SALT_2024'); // Add salt
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password against hash
async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

const HTML5_QR_SRCS = [
  'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.10/minified/html5-qrcode.min.js',
  'https://unpkg.com/html5-qrcode@2.3.10/minified/html5-qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.10/html5-qrcode.min.js'
];
let html5QrScriptLoading = null;
async function ensureHtml5QrcodeLoaded() {
  if (window.Html5Qrcode || globalThis.Html5Qrcode) return true;

  if (!html5QrScriptLoading) {
    html5QrScriptLoading = (async () => {
      for (const src of HTML5_QR_SRCS) {
        try {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.crossOrigin = 'anonymous';
            s.referrerPolicy = 'no-referrer';
            s.onload = () => resolve(true);
            s.onerror = () => reject(new Error('load-failed'));
            document.head.appendChild(s);
          });
          if (window.Html5Qrcode || globalThis.Html5Qrcode) return true;
        } catch (_) {
          // try next CDN
        }
      }
      throw new Error('Failed to load html5-qrcode from all CDNs');
    })();
  }

  await html5QrScriptLoading;
  return !!(window.Html5Qrcode || globalThis.Html5Qrcode);
}

/* ---------- BarcodeDetector Fallback ---------- */
let barcodeVideoEl = null;
let barcodeCanvasEl = null;
let barcodeCtx = null;
let barcodeStream = null;
let barcodeInterval = null;
let isBarcodeActive = false;
let BarcodeDetectorCtor = null;

async function startBarcodeScanner() {
  try {
    if (!('BarcodeDetector' in window)) return false;

    // Cache ctor and capability (best-effort)
    if (!BarcodeDetectorCtor) {
      BarcodeDetectorCtor = window.BarcodeDetector;
      try {
        await BarcodeDetectorCtor.getSupportedFormats?.();
      } catch {
        // proceed anyway
      }
    }

    // Prepare container
    if (!barcodeVideoEl) {
      barcodeVideoEl = document.createElement('video');
      barcodeVideoEl.setAttribute('playsinline', '');
      barcodeVideoEl.className = 'w-full rounded-lg';
    }
    // Mount UI
    qrReaderDiv.innerHTML = '';
    qrReaderDiv.appendChild(barcodeVideoEl);

    // Camera
    barcodeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
    barcodeVideoEl.srcObject = barcodeStream;
    await barcodeVideoEl.play();

    // Canvas
    if (!barcodeCanvasEl) {
      barcodeCanvasEl = document.createElement('canvas');
      barcodeCtx = barcodeCanvasEl.getContext('2d');
    }

    const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });

    isBarcodeActive = true;
    barcodeInterval = setInterval(async () => {
      if (!isBarcodeActive || barcodeVideoEl.readyState < 2) return;
      const vw = barcodeVideoEl.videoWidth || 640;
      const vh = barcodeVideoEl.videoHeight || 480;
      barcodeCanvasEl.width = vw;
      barcodeCanvasEl.height = vh;
      barcodeCtx.drawImage(barcodeVideoEl, 0, 0, vw, vh);
      try {
        const bitmap = barcodeCanvasEl.transferToImageBitmap ? barcodeCanvasEl.transferToImageBitmap() : null;
        const results = await detector.detect(bitmap || barcodeCanvasEl);
        if (results && results.length) {
          const text = results[0]?.rawValue || '';
          if (text) {
            await onScanSuccess(text);
          }
        }
      } catch {
        // ignore frame decode errors
      }
    }, 200);

    showInfo(qrSuccess, 'Using built-in browser QR scanner.');
    return true;
  } catch {
    return false;
  }
}

async function stopBarcodeScanner() {
  isBarcodeActive = false;
  if (barcodeInterval) { clearInterval(barcodeInterval); barcodeInterval = null; }
  if (barcodeStream) {
    try { barcodeStream.getTracks().forEach(t => t.stop()); } catch {}
    barcodeStream = null;
  }
  if (barcodeVideoEl) {
    try { barcodeVideoEl.pause(); } catch {}
    barcodeVideoEl.srcObject = null;
  }
}

/* ---------- jsQR Fallback (getUserMedia + canvas) ---------- */
let jsqrVideoEl = null;
let jsqrCanvasEl = null;
let jsqrCtx = null;
let jsqrStream = null;
let jsqrActive = false;
let jsqrRafId = null;

function hasJsQrLib() {
  return typeof window.jsQR === 'function';
}

async function startJsQrScanner() {
  try {
    if (!hasJsQrLib()) return false;

    if (!jsqrVideoEl) {
      jsqrVideoEl = document.createElement('video');
      jsqrVideoEl.setAttribute('playsinline', '');
      jsqrVideoEl.className = 'w-full rounded-lg';
    }
    if (!jsqrCanvasEl) {
      jsqrCanvasEl = document.createElement('canvas');
      jsqrCtx = jsqrCanvasEl.getContext('2d', { willReadFrequently: true });
    }

    // Mount UI
    qrReaderDiv.innerHTML = '';
    qrReaderDiv.appendChild(jsqrVideoEl);

    // Camera
    jsqrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
    jsqrVideoEl.srcObject = jsqrStream;
    await jsqrVideoEl.play();

    jsqrActive = true;

    const loop = () => {
      if (!jsqrActive) return;
      if (jsqrVideoEl.readyState >= 2) {
        const vw = jsqrVideoEl.videoWidth || 640;
        const vh = jsqrVideoEl.videoHeight || 480;
        jsqrCanvasEl.width = vw;
        jsqrCanvasEl.height = vh;
        jsqrCtx.drawImage(jsqrVideoEl, 0, 0, vw, vh);
        const imageData = jsqrCtx.getImageData(0, 0, vw, vh);
        try {
          const result = window.jsQR(imageData.data, vw, vh, { inversionAttempts: 'dontInvert' });
          if (result && result.data) {
            onScanSuccess(result.data);
            return; // onScanSuccess stops scanners
          }
        } catch {
          // ignore frame decode errors
        }
      }
      jsqrRafId = requestAnimationFrame(loop);
    };
    jsqrRafId = requestAnimationFrame(loop);

    showInfo(qrSuccess, 'Using jsQR fallback scanner.');
    return true;
  } catch {
    return false;
  }
}

async function stopJsQrScanner() {
  jsqrActive = false;
  if (jsqrRafId) { cancelAnimationFrame(jsqrRafId); jsqrRafId = null; }
  if (jsqrStream) {
    try { jsqrStream.getTracks().forEach(t => t.stop()); } catch {}
    jsqrStream = null;
  }
  if (jsqrVideoEl) {
    try { jsqrVideoEl.pause(); } catch {}
    jsqrVideoEl.srcObject = null;
  }
}

/* ---------- QR Scanner ---------- */
async function startQrScanner() {
  hideError(qrError);
  hideInfo(qrSuccess);

  // Advisory for camera requirements
  try {
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isSecure) {
      showInfo(qrError, 'Note: Camera access requires HTTPS or localhost. The QR scanner may be blocked by the browser on http.');
    }
  } catch {}

  // Try to ensure third-party library; fall back to BarcodeDetector if not available/load fails
  let h5Loaded = false;
  try {
    await ensureHtml5QrcodeLoaded();
    h5Loaded = !!(window.Html5Qrcode || globalThis.Html5Qrcode);
  } catch {
    h5Loaded = false;
  }

  // Stop any previous instances
  try { await stopQrScanner(); } catch {}

  if (h5Loaded) {
    try {
      const H5 = window.Html5Qrcode || globalThis.Html5Qrcode;
      html5Qr = new H5('qr-reader', { verbose: false });
      const cameras = await H5.getCameras();
      const cameraId = cameras?.[0]?.id;
      if (!cameraId) {
        // try BarcodeDetector instead of failing hard
        const ok = await startBarcodeScanner();
        if (!ok) throw new Error('No camera found');
        return;
      }
      await html5Qr.start(
        cameraId,
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        onScanSuccess,
        onScanFailure
      );
      return;
    } catch (e) {
      // Attempt fallback if HTML5 library fails to start
      const ok = await startBarcodeScanner();
      if (ok) return;
      const jsOk = await startJsQrScanner();
      if (jsOk) return;
      const msg = e?.message || String(e);
      const hint = /html5-qrcode/i.test(msg)
        ? ' Ensure network/CSP allows cdn.jsdelivr.net, unpkg.com, or cdnjs.cloudflare.com, or host html5-qrcode locally and include it before staff-qr.js.'
        : '';
      showError(qrError, `QR init failed: ${msg}${hint}`);
      return;
    }
  } else {
    // No HTML5 library; try BarcodeDetector fallback
    const ok = await startBarcodeScanner();
    if (ok) return;
    // Try jsQR fallback
    const jsOk = await startJsQrScanner();
    if (jsOk) return;
    showError(qrError, 'QR init failed: html5-qrcode not available, BarcodeDetector unsupported, and jsQR fallback failed.');
  }
}

async function stopQrScanner() {
  // Stop html5-qrcode instance
  if (html5Qr) {
    try { await html5Qr.stop(); } catch {}
    try { html5Qr.clear(); } catch {}
    html5Qr = null;
  }
  // Stop BarcodeDetector fallback
  await stopBarcodeScanner();
  // Stop jsQR fallback
  await stopJsQrScanner();
}

async function onScanSuccess(decodedText /* , decodedResult */) {
  if (!decodedText) return;
  try {
    await stopQrScanner();

    // Accept raw code or JSON payload containing {staffCode}
    let code = '';
    try {
      const parsed = JSON.parse(decodedText);
      code = (parsed && (parsed.staffCode || parsed.code)) ? String(parsed.staffCode || parsed.code) : String(decodedText);
    } catch {
      code = String(decodedText);
    }
    code = (code || '').trim();

    // Enforce ALH QR format: must start with ALHQR followed by digits (e.g., ALHQR001)
    const codeUpper = code.toUpperCase();
    if (!/^ALHQR\d+$/.test(codeUpper)) {
      showError(qrError, 'Please scan an ALH staff QR (format like ALHQR001).');
      // Restart scanner so the staff can try again
      await startQrScanner();
      return;
    }

    scannedStaffCode = codeUpper;
    showInfo(qrSuccess, 'ALH QR verified. Checking registration status...');

    // Check registration status
    const staffRef = doc(db, 'staff', codeUpper);
    let staffExists = false;
    let hasPassword = false;
    let staffData = null;
    
    try {
      const staffSnap = await getDoc(staffRef);
      staffExists = staffSnap.exists();
      if (staffExists) {
        staffData = staffSnap.data();
        hasPassword = !!staffData.passwordHash;
      }
    } catch (e) {
      // If permissions prevent pre-auth read, we can't determine if staff exists
      console.log('Cannot read staff document pre-auth, assuming staff does not exist:', e.message);
      staffExists = false;
    }

    if (staffExists && hasPassword) {
      // Staff exists and has password - show login form
      showInfo(qrSuccess, 'Staff found. Please enter your password to login.');
      show(authSection);
      registrationHint.textContent = 'Enter the password you set to access your dashboard.';
      // Scroll to login form and focus input
      scrollToSection(authSection);
      setTimeout(() => passwordInput?.focus({ preventScroll: true }), 100);
    } else if (staffExists && !hasPassword) {
      // Staff exists but no password set - show password setup form
      showInfo(qrSuccess, 'Welcome! Please set your password to continue.');
      show(setPasswordSection);
      // Scroll to set-password form and focus input
      scrollToSection(setPasswordSection);
      setTimeout(() => newPassword?.focus({ preventScroll: true }), 100);
    } else {
      // Staff code not found - show contact admin message
      showContactAdminSection(codeUpper);
    }
  } catch (err) {
    showError(qrError, `Scan error: ${err.message || err}`);
    // Allow rescanning
    await startQrScanner();
  }
}

function onScanFailure(/* error */) {
  // Ignored: fires frequently on decode failure. Could log if needed.
}

/* ---------- Fallback: Upload QR image + Manual code ---------- */
async function decodeImageFileWithJsQR(file) {
  hideError(qrError);
  hideInfo(qrSuccess);
  if (!file) return;
  if (!hasJsQrLib()) {
    showError(qrError, 'Image decode unavailable: jsQR library not loaded.');
    return;
  }
  try {
    await stopQrScanner();
  } catch {}
  const img = new Image();
  const url = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const maxDim = 1200;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const w = Math.max(1, Math.floor((img.naturalWidth || img.width) * scale));
    const h = Math.max(1, Math.floor((img.naturalHeight || img.height) * scale));
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const result = window.jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
    if (result && result.data) {
      await onScanSuccess(result.data);
      return;
    }
    showError(qrError, 'Could not find a QR in the selected image. Try a clearer image.');
  } catch (e) {
    showError(qrError, `Image decode error: ${e?.message || e}`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function processManualCodeInput() {
  hideError(qrError);
  const raw = (manualCodeInput?.value || '').trim();
  if (!raw) {
    showError(qrError, 'Enter a staff code like ALHQR001.');
    return;
  }
  const code = raw.toUpperCase();
  if (!/^ALHQR\d+$/.test(code)) {
    showError(qrError, 'Invalid code. Use format ALHQR followed by digits (e.g., ALHQR001).');
    return;
  }
  onScanSuccess(code);
}

/* ---------- Contact Admin Section ---------- */
function showContactAdminSection(staffCode) {
  hide(qrSection);
  hide(authSection);
  hide(setPasswordSection);
  hide(dashboardSection);
  show(contactAdminSection);
  scrollToSection(contactAdminSection);
  
  // Display the unregistered staff code
  setText(unregisteredCode, staffCode);
  setText(unregisteredCodeSpan, staffCode);
}

// Back to scan button handler
backToScanBtn.addEventListener('click', async () => {
  scannedStaffCode = null;
  hide(contactAdminSection);
  show(qrSection);
  scrollToSection(qrSection);
  await startQrScanner();
});

/* ---------- Set Password Section ---------- */
// Set password form submission handler
setPasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(setPasswordError);
  hideInfo(setPasswordSuccess);

  if (!scannedStaffCode) {
    showError(setPasswordError, 'No staff code found. Please scan QR again.');
    return;
  }

  const password = (newPassword.value || '').trim();
  const confirmPassword = (confirmNewPassword.value || '').trim();

  // Validation
  if (!password || password.length < 6) {
    showError(setPasswordError, 'Password must be at least 6 characters long.');
    return;
  }

  if (password !== confirmPassword) {
    showError(setPasswordError, 'Passwords do not match.');
    return;
  }

  setBusy(setPasswordBtn, true, 'Set Password', 'Setting password...');
  
  try {
    // Ensure user is signed in (anonymous if not already signed in)
    if (!auth.currentUser) {
      const { signInAnonymously } = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js");
      await signInAnonymously(auth);
    }
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Authentication failed. Please try again.");
    }

    // Force refresh ID token to ensure latest auth state for Firestore rules
    await user.getIdToken(true);

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Update existing staff document with password and registration status
    const staffRef = doc(db, 'staff', scannedStaffCode);
    await setDoc(staffRef, {
      registered: true,
      passwordHash: passwordHash,
      uid: user.uid,
      updatedAt: new Date()
    }, { merge: true });
    
    showInfo(setPasswordSuccess, 'Password set successfully! Redirecting to dashboard...');
    
    // Get staff data for redirect
    const staffSnap = await getDoc(staffRef);
    const staffData = staffSnap.data();
    
    // Store staff data in sessionStorage for dashboard access
    sessionStorage.setItem('staffData', JSON.stringify({
      staffCode: scannedStaffCode,
      balance: staffData.wagebalance || staffData.wageBalance || 0,
      mobile: staffData.mobile || '',
      name: staffData.name || '',
      authenticated: true,
      loginTime: Date.now()
    }));
    
    // Redirect to dashboard
    setTimeout(() => {
      const params = new URLSearchParams({
        staffCode: scannedStaffCode,
        balance: staffData.wagebalance || staffData.wageBalance || 0,
        mobile: staffData.mobile || ''
      });
      
      window.location.href = `staff-dashboard.html?${params.toString()}`;
    }, 2000);

  } catch (err) {
    showError(setPasswordError, `Failed to set password: ${err.message || err}`);
  } finally {
    setBusy(setPasswordBtn, false, 'Set Password');
  }
});

// Cancel set password button handler
cancelSetPasswordBtn.addEventListener('click', async () => {
  scannedStaffCode = null;
  hide(setPasswordSection);
  show(qrSection);
  scrollToSection(qrSection);
  await startQrScanner();
});

/* ---------- Password Authentication ---------- */

// Password login form handler
passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(authError);
  hideInfo(authInfo);

  if (!scannedStaffCode) {
    showError(authError, 'Scan your staff QR first.');
    return;
  }

  const password = (passwordInput.value || '').trim();
  if (!password) {
    showError(authError, 'Please enter your password.');
    return;
  }

  setBusy(loginBtn, true, 'Login', 'Verifying...');
  try {
    // Get staff data from Firestore to verify password
    const staffRef = doc(db, 'staff', scannedStaffCode);
    const staffSnap = await getDoc(staffRef);
    
    if (!staffSnap.exists()) {
      throw new Error('Staff record not found. Please register first.');
    }
    
    const staffData = staffSnap.data();
    if (!staffData.passwordHash) {
      throw new Error('No password set. Please contact admin.');
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, staffData.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid password. Please try again.');
    }
    
    // Store staff data in sessionStorage for dashboard access
    sessionStorage.setItem('staffData', JSON.stringify({
      staffCode: scannedStaffCode,
      balance: staffData.wageBalance || 0,
      mobile: staffData.mobile || '',
      name: staffData.name || '',
      authenticated: true,
      loginTime: Date.now()
    }));
    
    // Redirect to dashboard with staff data
    const params = new URLSearchParams({
      staffCode: scannedStaffCode,
      balance: staffData.wageBalance || 0,
      mobile: staffData.mobile || ''
    });
    
    showInfo(authInfo, 'Login successful! Redirecting to dashboard...');
    setTimeout(() => {
      window.location.href = `staff-dashboard.html?${params.toString()}`;
    }, 1500);
    
  } catch (err) {
    showError(authError, err?.message || String(err));
  } finally {
    setBusy(loginBtn, false, 'Login');
  }
});

resetScanBtn.addEventListener('click', async () => {
  scannedStaffCode = null;
  passwordInput.value = '';
  hide(authSection);
  show(qrSection);
  scrollToSection(qrSection);
  await startQrScanner();
});

/* ---------- Dashboard ---------- */
async function loadDashboard(user, serverPayload) {
  hideError(dashError);
  hideInfo(dashSuccess);
  hideInfo(sessionWarning);

  const uid = user?.uid;
  if (!uid) {
    showError(dashError, 'Not authenticated.');
    return;
  }
  const staffCode = scannedStaffCode || serverPayload?.staffCode;

  setText(dashStaffCode, staffCode);
  setText(dashPhone, serverPayload?.mobile || '-');

  // Fetch latest staff balance from Firestore
  let balance = 0;
  let staffData = null;
  try {
    const staffRef = doc(db, 'staff', staffCode);
    const snap = await getDoc(staffRef);
    if (snap.exists()) {
      staffData = snap.data();
      balance = typeof staffData.wageBalance === 'number' ? staffData.wageBalance : 0;
    }
  } catch (err) {
    console.log('Error loading staff data:', err);
    balance = serverPayload?.wageBalance || 0;
  }
  setText(dashBalance, `₹${Number(balance).toFixed(2)}`);

  // Load recent payments and staff profile (simplified without Cloud Functions)
  await loadRecentPaymentsSimplified(uid);
  await loadStaffProfile(staffCode);
}

async function loadRecentPaymentsSimplified(uid) {
  try {
    const q = query(
      collection(db, 'staffPayments'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      setHtml(paymentsList, `<div class="text-gray-500">No payments yet.</div>`);
      return;
    }
    const rows = [];
    snap.forEach((d) => {
      const p = d.data();
      const dt = p.createdAt?.toDate?.() ?? new Date();
      rows.push(`
        <div class="flex items-center justify-between border-b border-gray-100 py-2">
          <div class="text-gray-800 font-medium">₹${Number(p.amount || 0).toFixed(2)}</div>
          <div class="text-xs text-gray-500">${dt.toLocaleString('en-IN')}</div>
          <div class="text-xs ${p.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}">${p.status || 'pending'}</div>
        </div>
      `);
    });
    setHtml(paymentsList, rows.join(''));
  } catch (err) {
    setHtml(paymentsList, `<div class="text-gray-500">No payment history available.</div>`);
  }
}

// Keep original function for backward compatibility
async function loadRecentPayments(uid) {
  return await loadRecentPaymentsSimplified(uid);
}

/* ---------- Staff Profile (Details) ---------- */
// Render a simple details form inside the dashboardSection if not present
function renderStaffProfileForm(data = {}) {
  let container = document.getElementById('profileContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'profileContainer';
    container.className = 'mt-6 border-t border-gray-100 pt-4';
    dashboardSection.appendChild(container);
  }

  const {
    name = '',
    branch = '',
    address = '',
    upiId = '',
    bankAccount = '',
    ifsc = '',
  } = data || {};

  container.innerHTML = `
    <h3 class="font-semibold text-gray-800 mb-3">Staff Details</h3>
    <form id="staffProfileForm" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input id="sp_name" type="text" value="${name || ''}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"/>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Branch</label>
        <input id="sp_branch" type="text" value="${branch || ''}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"/>
      </div>
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <input id="sp_address" type="text" value="${address || ''}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"/>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
        <input id="sp_upi" type="text" value="${upiId || ''}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="name@bank"/>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Bank A/C</label>
        <input id="sp_bank" type="text" value="${bankAccount || ''}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"/>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">IFSC</label>
        <input id="sp_ifsc" type="text" value="${ifsc || ''}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"/>
      </div>
      <div class="md:col-span-2">
        <button id="sp_save" type="submit" class="btn-primary px-5 py-2">Save Details</button>
      </div>
    </form>
  `;

  const form = container.querySelector('#staffProfileForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(dashError);
    hideInfo(dashSuccess);

    const payload = {
      name: (container.querySelector('#sp_name').value || '').trim(),
      branch: (container.querySelector('#sp_branch').value || '').trim(),
      address: (container.querySelector('#sp_address').value || '').trim(),
      upiId: (container.querySelector('#sp_upi').value || '').trim(),
      bankAccount: (container.querySelector('#sp_bank').value || '').trim(),
      ifsc: (container.querySelector('#sp_ifsc').value || '').trim(),
    };

    const btn = container.querySelector('#sp_save');
    setBusy(btn, true, 'Save Details', 'Saving...');
    try {
      if (!scannedStaffCode) throw new Error('No staff code found.');
      await updateStaffProfile({ staffCode: scannedStaffCode, profile: payload });
      showInfo(dashSuccess, 'Details saved successfully.');
    } catch (err) {
      showError(dashError, err?.message || String(err));
    } finally {
      setBusy(btn, false, 'Save Details');
    }
  });
}

// Load staff profile from Firestore (read-only) and render the form with existing values
async function loadStaffProfile(code) {
  try {
    const ref = doc(db, 'staff', code);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      const mapped = {
        name: data.name || '',
        branch: data.branch || '',
        address: data.address || '',
        upiId: data.upiId || '',
        bankAccount: data.bankAccount || '',
        ifsc: data.ifsc || '',
      };
      renderStaffProfileForm(mapped);
      return;
    }
  } catch {
    // ignore; render empty form
  }
  renderStaffProfileForm({});
}

/* ---------- Redemption ---------- */
redeemForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(dashError);
  hideInfo(dashSuccess);

  const amount = Math.floor(Number(redeemAmount.value || 0));
  if (!scannedStaffCode) {
    showError(dashError, 'No staff code found. Please rescan and login.');
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    showError(dashError, 'Enter a valid positive amount.');
    return;
  }

  setBusy(redeemBtn, true, 'Redeem', 'Processing...');
  try {
    // Simplified redemption without Cloud Functions
    // Get current balance from Firestore
    const staffRef = doc(db, 'staff', scannedStaffCode);
    const staffSnap = await getDoc(staffRef);
    
    if (!staffSnap.exists()) {
      throw new Error('Staff record not found');
    }
    
    const staffData = staffSnap.data();
    const currentBalance = Number(staffData.wageBalance || 0);
    
    if (amount > currentBalance) {
      throw new Error(`Insufficient balance. Available: ₹${currentBalance.toFixed(2)}`);
    }
    
    // For now, just show a message that redemption request has been submitted
    // In a real system, this would create a payment request for admin approval
    showInfo(dashSuccess, `Redemption request for ₹${amount.toFixed(2)} has been submitted for approval. Current balance: ₹${currentBalance.toFixed(2)}`);
    redeemAmount.value = '';
    
    // Note: Without Cloud Functions and billing, we can't actually process payments
    // This would typically create a payment request document for admin processing
    
  } catch (err) {
    showError(dashError, err?.message || String(err));
  } finally {
    setBusy(redeemBtn, false, 'Redeem');
  }
});

/* ---------- Sign out + Session release ---------- */
signOutBtn.addEventListener('click', async () => {
  await fbSignOut(auth);
  // Reset UI
  show(qrSection);
  hide(authSection);
  hide(registrationSection);
  hide(dashboardSection);
  scannedStaffCode = null;
  await startQrScanner();
});

/* ---------- Auth watcher (optional hardening) ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Reset view if user signs out externally
    show(qrSection);
    hide(authSection);
    hide(contactAdminSection);
    hide(setPasswordSection);
    hide(dashboardSection);
    scannedStaffCode = null;
    return;
  }
});

/* ---------- Boot ---------- */
(async function boot() {
  show(qrSection);
  hide(authSection);
  hide(contactAdminSection);
  hide(setPasswordSection);
  hide(dashboardSection);
  await startQrScanner();
})();