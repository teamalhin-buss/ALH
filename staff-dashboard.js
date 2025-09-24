x/**
 * Staff Dashboard (vanilla JS)
 * - Load staff information from URL parameters
 * - Display wage balance and staff details
 * - Handle redemption requests
 * - Manage staff profile updates
 */

import { auth, db, doc, getDoc, setDoc } from './alh-firebase.js';
import {
  onAuthStateChanged,
  signOut as fbSignOut,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/* ---------- Elements ---------- */
const loadingSection = document.getElementById('loadingSection');
const dashboardSection = document.getElementById('dashboardSection');
const sessionWarning = document.getElementById('sessionWarning');
const dashError = document.getElementById('dashError');
const dashSuccess = document.getElementById('dashSuccess');
const dashPhone = document.getElementById('dashPhone');
const dashBalance = document.getElementById('dashBalance');
const redeemForm = document.getElementById('redeemForm');
const redeemAmount = document.getElementById('redeemAmount');
const redeemBtn = document.getElementById('redeemBtn');
const signOutBtn = document.getElementById('signOutBtn');
const backToLoginBtn = document.getElementById('backToLoginBtn');
const paymentsList = document.getElementById('paymentsList');
const profileContainer = document.getElementById('profileContainer');

/* ---------- State ---------- */
let currentStaffCode = null;
let currentStaffData = null;

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

/* ---------- URL Parameters ---------- */
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    staffCode: params.get('staffCode'),
    balance: params.get('balance'),
    mobile: params.get('mobile')
  };
}

/* ---------- Dashboard Loading ---------- */
async function loadDashboard() {
  hideError(dashError);
  hideInfo(dashSuccess);
  hideInfo(sessionWarning);

  // Check session authentication
  const staffData = sessionStorage.getItem('staffData');
  let sessionAuth = null;
  
  if (staffData) {
    try {
      sessionAuth = JSON.parse(staffData);
      // Check if session is still valid (24 hours)
      const sessionAge = Date.now() - (sessionAuth.loginTime || 0);
      if (sessionAge > 24 * 60 * 60 * 1000) {
        sessionStorage.removeItem('staffData');
        sessionAuth = null;
      }
    } catch (e) {
      sessionStorage.removeItem('staffData');
      sessionAuth = null;
    }
  }

  const urlParams = getUrlParams();
  currentStaffCode = urlParams.staffCode || sessionAuth?.staffCode;

  if (!currentStaffCode) {
    showError(dashError, 'No staff code provided. Please scan your QR code again.');
    setTimeout(() => {
      window.location.href = 'staff.html';
    }, 3000);
    return;
  }

  // Verify session matches URL params
  if (sessionAuth && sessionAuth.staffCode !== currentStaffCode) {
    showError(dashError, 'Session mismatch. Please login again.');
    sessionStorage.removeItem('staffData');
    setTimeout(() => {
      window.location.href = 'staff.html';
    }, 3000);
    return;
  }

  setText(dashPhone, urlParams.mobile || sessionAuth?.mobile || '-');

  // Always fetch fresh data from Firestore to get latest balance
  let balance = 0;
  try {
    const staffRef = doc(db, 'staff', currentStaffCode);
    const snap = await getDoc(staffRef);
    if (snap.exists()) {
      currentStaffData = snap.data();
      console.log('Staff data from Firebase:', currentStaffData); // Debug log
      // Check multiple possible field names for balance
      balance = currentStaffData.wagebalance || currentStaffData.balance || currentStaffData.wageBalance || 0;
      console.log('Balance found:', balance); // Debug log
    } else {
      console.log('Staff document not found in Firebase');
      balance = parseFloat(urlParams.balance) || 0;
    }
  } catch (err) {
    console.log('Error loading staff data:', err);
    balance = parseFloat(urlParams.balance) || (sessionAuth ? sessionAuth.balance || 0 : 0);
  }
  setText(dashBalance, `₹${Number(balance).toFixed(2)}`);

  // Load recent payments and staff profile
  await loadRecentPayments();
  await loadStaffProfile();

  // Show dashboard
  hide(loadingSection);
  show(dashboardSection);
}

/* ---------- Recent Transactions ---------- */
async function loadRecentPayments() {
  try {
    if (!currentStaffCode) return;
    
    // Show loading state
    activityLoading.classList.remove('hidden');
    emptyState.classList.add('hidden');
    transactionList.innerHTML = '';
    
    // Query transactions collection for this staff member
    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef,
      where('staffCode', '==', currentStaffCode),
      orderBy('timestamp', 'desc'),
      limit(50) // Show last 50 transactions
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      emptyState.classList.remove('hidden');
      activityLoading.classList.add('hidden');
      return;
    }
    
    // Process transactions
    let transactionsHtml = '';
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const date = data.timestamp?.toDate ? data.timestamp.toDate() : new Date();
      const formattedDate = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Determine transaction type and styling
      let typeClass = 'text-gray-600';
      let icon = 'fa-exchange-alt';
      let amountClass = '';
      
      if (data.type === 'credit') {
        typeClass = 'text-green-600';
        icon = 'fa-plus-circle';
        amountClass = 'text-green-600';
      } else if (data.type === 'debit') {
        typeClass = 'text-red-600';
        icon = 'fa-minus-circle';
        amountClass = 'text-red-600';
      } else if (data.type === 'bonus') {
        typeClass = 'text-yellow-600';
        icon = 'fa-gift';
        amountClass = 'text-yellow-600';
      } else if (data.type === 'adjustment') {
        typeClass = 'text-blue-600';
        icon = 'fa-adjust';
        amountClass = 'text-blue-600';
      }
      
      // Create transaction item
      transactionsHtml += `
        <div class="transaction-item bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" 
             data-type="${data.status || 'completed'}" 
             onclick="showTransactionDetails('${doc.id}')">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-full ${typeClass} bg-opacity-10 flex items-center justify-center">
                <i class="fas ${icon} ${typeClass}"></i>
              </div>
              <div>
                <h4 class="text-sm font-semibold text-gray-800">${data.status === 'pending' ? 'Will be credited in 12 hours' : data.status === 'approved' ? 'Approved - will be processed shortly' : (data.reason || data.description || (data.type === 'credit' ? 'Money added by admin' : 'Transaction'))}</h4>
                <p class="text-xs text-gray-500">${formattedDate}</p>
                ${data.status ? `<span class="inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${data.status === 'completed' ? 'bg-green-100 text-green-800' : data.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                  ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                </span>` : ''}
              </div>
            </div>
            <div class="text-right">
              <p class="font-semibold ${amountClass}">${data.type === 'debit' ? '-' : '+'}₹${Number(data.amount).toFixed(2)}</p>
              <p class="text-xs text-gray-500">Balance: ₹${Number(data.balanceAfter || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      `;
    });
    
    transactionList.innerHTML = transactionsHtml;
    activityLoading.classList.add('hidden');
    
  } catch (err) {
    console.error('Error loading transactions:', err);
    setHtml(transactionList, `
      <div class="text-center py-8">
        <i class="fas fa-exclamation-triangle text-yellow-500 text-2xl mb-2"></i>
        <p class="text-gray-600">Error loading transaction history</p>
        <p class="text-sm text-gray-500 mt-1">${err.message || 'Please try again later'}</p>
      </div>
    `);
    document.getElementById('activityLoading').classList.add('hidden');
  }
}

// Show transaction details in modal
window.showTransactionDetails = async (transactionId) => {
  try {
    if (!transactionId) return;
    
    const docRef = doc(db, 'transactions', transactionId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Transaction not found');
    }
    
    const data = docSnap.data();
    const modal = document.getElementById('transactionModal');
    
    // Format date
    const date = data.timestamp?.toDate ? data.timestamp.toDate() : new Date();
    const formattedDate = date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Set modal content
    document.getElementById('receiptNumber').textContent = docSnap.id.substring(0, 8).toUpperCase();
    document.getElementById('transactionType').textContent = getTransactionTypeLabel(data.type);
    document.getElementById('transactionAmount').textContent = `₹${Number(data.amount).toFixed(2)}`;
    document.getElementById('transactionAmount').className = `text-lg font-bold ${data.type === 'debit' ? 'text-red-600' : 'text-green-600'}`;
    document.getElementById('transactionDateTime').textContent = formattedDate;
    
    // Set description based on status and available fields
    let description;
    if (data.status === 'pending') {
      description = 'Will be credited in 12 hours';
    } else if (data.status === 'approved') {
      description = 'Approved - will be processed shortly';
    } else {
      description = data.reason || data.description || 
                   (data.type === 'credit' ? 'Money added by admin' : 'No reason specified');
    }
    document.getElementById('transactionDescription').textContent = description;
    
    document.getElementById('generatedDate').textContent = new Date().toLocaleString('en-IN');
    
    // Set status
    const statusEl = document.getElementById('transactionStatus');
    statusEl.className = '';
    if (data.status === 'completed') {
      statusEl.className = 'text-green-600';
      statusEl.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Completed';
    } else if (data.status === 'pending') {
      statusEl.className = 'text-yellow-600';
      statusEl.innerHTML = '<i class="fas fa-clock mr-1"></i> Pending';
    } else if (data.status === 'rejected') {
      statusEl.className = 'text-red-600';
      statusEl.innerHTML = '<i class="fas fa-times-circle mr-1"></i> Rejected';
    } else {
      statusEl.className = 'text-gray-600';
      statusEl.innerHTML = '<i class="fas fa-info-circle mr-1"></i> ' + (data.status || 'Unknown');
    }
    
    // Show additional details if available
    const staffDetails = document.getElementById('staffDetails');
    const creditDetails = document.getElementById('creditDetails');
    const reasonRow = document.getElementById('reasonRow');
    
    if (data.staffName || data.upiId) {
      document.getElementById('staffName').textContent = data.staffName || 'N/A';
      document.getElementById('upiId').textContent = data.upiId || 'N/A';
      staffDetails.classList.remove('hidden');
    } else {
      staffDetails.classList.add('hidden');
    }
    
    if (data.addedBy) {
      document.getElementById('addedBy').textContent = data.addedBy;
      if (data.reason) {
        document.getElementById('reason').textContent = data.reason;
        reasonRow.classList.remove('hidden');
      } else {
        reasonRow.classList.add('hidden');
      }
      creditDetails.classList.remove('hidden');
    } else {
      creditDetails.classList.add('hidden');
    }
    
    // Show the modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
  } catch (err) {
    console.error('Error showing transaction details:', err);
    showError(dashError, 'Failed to load transaction details. ' + (err.message || ''));
  }
};

// Helper function to get transaction type label
function getTransactionTypeLabel(type) {
  const types = {
    'credit': 'Credit',
    'debit': 'Withdrawal',
    'bonus': 'Bonus',
    'adjustment': 'Admin Adjustment',
    'refund': 'Refund',
    'reversal': 'Reversal'
  };
  return types[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

// Close transaction modal
document.getElementById('closeTransactionModal')?.addEventListener('click', () => {
  document.getElementById('transactionModal').classList.add('hidden');
  document.body.style.overflow = 'auto';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  const modal = document.getElementById('transactionModal');
  if (e.target === modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }
});

// Refresh transactions when refresh button is clicked
document.getElementById('refreshActivity')?.addEventListener('click', loadRecentPayments);

/* ---------- Staff Profile ---------- */
async function loadStaffProfile() {
  try {
    const ref = doc(db, 'staff', currentStaffCode);
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

function renderStaffProfileForm(data = {}) {
  const {
    name = '',
    branch = '',
    address = '',
    upiId = '',
    bankAccount = '',
    ifsc = '',
  } = data || {};

  profileContainer.innerHTML = `
    <h3 class="text-lg font-semibold text-gray-800 mb-4">Staff Details</h3>
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

  const form = profileContainer.querySelector('#staffProfileForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(dashError);
    hideInfo(dashSuccess);

    const payload = {
      name: (profileContainer.querySelector('#sp_name').value || '').trim(),
      branch: (profileContainer.querySelector('#sp_branch').value || '').trim(),
      address: (profileContainer.querySelector('#sp_address').value || '').trim(),
      upiId: (profileContainer.querySelector('#sp_upi').value || '').trim(),
      bankAccount: (profileContainer.querySelector('#sp_bank').value || '').trim(),
      ifsc: (profileContainer.querySelector('#sp_ifsc').value || '').trim(),
    };

    const btn = profileContainer.querySelector('#sp_save');
    setBusy(btn, true, 'Save Details', 'Saving...');
    try {
      if (!currentStaffCode) throw new Error('No staff code found.');
      
      // Update staff profile in Firestore
      const staffRef = doc(db, 'staff', currentStaffCode);
      await setDoc(staffRef, payload, { merge: true });
      
      showInfo(dashSuccess, 'Details saved successfully.');
    } catch (err) {
      showError(dashError, err?.message || String(err));
    } finally {
      setBusy(btn, false, 'Save Details');
    }
  });
}

/* ---------- Redemption ---------- */
redeemForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(dashError);
  hideInfo(dashSuccess);

  const amount = Math.floor(Number(redeemAmount.value || 0));
  if (!currentStaffCode) {
    showError(dashError, 'No staff code found. Please refresh the page.');
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    showError(dashError, 'Enter a valid positive amount.');
    return;
  }

  setBusy(redeemBtn, true, 'Request Payment', 'Processing...');
  try {
    // Get current balance from Firestore
    const staffRef = doc(db, 'staff', currentStaffCode);
    const staffSnap = await getDoc(staffRef);
    
    if (!staffSnap.exists()) {
      throw new Error('Staff record not found');
    }
    
    const staffData = staffSnap.data();
    const currentBalance = Number(staffData.wagebalance || 0);
    
    if (amount > currentBalance) {
      throw new Error(`Insufficient balance. Available: ₹${currentBalance.toFixed(2)}`);
    }
    
    // Show success message (in real system, this would create a payment request)
    showInfo(dashSuccess, `Payment request for ₹${amount.toFixed(2)} has been submitted for approval. Current balance: ₹${currentBalance.toFixed(2)}`);
    redeemAmount.value = '';
    
  } catch (err) {
    showError(dashError, err?.message || String(err));
  } finally {
    setBusy(redeemBtn, false, 'Request Payment');
  }
});

/* ---------- Sign Out ---------- */
signOutBtn.addEventListener('click', async () => {
  // Clear session data
  sessionStorage.removeItem('staffData');
  
  // Redirect to staff page
  window.location.href = 'staff.html';
});

/* ---------- Back to Login ---------- */
if (backToLoginBtn) {
  backToLoginBtn.addEventListener('click', () => {
    // Clear session data
    sessionStorage.removeItem('staffData');
    
    // Redirect to staff page
    window.location.href = 'staff.html';
  });
}

/* ---------- Session Check ---------- */
function checkSession() {
  const staffData = sessionStorage.getItem('staffData');
  if (!staffData) {
    // No session, redirect to staff page
    window.location.href = 'staff.html';
    return false;
  }
  
  try {
    const sessionAuth = JSON.parse(staffData);
    const sessionAge = Date.now() - (sessionAuth.loginTime || 0);
    if (sessionAge > 24 * 60 * 60 * 1000) {
      // Session expired
      sessionStorage.removeItem('staffData');
      window.location.href = 'staff.html';
      return false;
    }
    return true;
  } catch (e) {
    sessionStorage.removeItem('staffData');
    window.location.href = 'staff.html';
    return false;
  }
}

/* ---------- Boot ---------- */
(async function boot() {
  // Check session before loading dashboard
  if (checkSession()) {
    await loadDashboard();
  }
  // If session check fails, user will be redirected automatically
})();