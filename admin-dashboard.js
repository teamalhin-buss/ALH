// Admin Dashboard JavaScript - Modular Architecture

// Firebase will be initialized when the scripts load
let app, auth, db;

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDDQKyBnjtay0AB-XliyT0zOZgEqiG9IdY",
  authDomain: "alh-perfume.firebaseapp.com",
  projectId: "alh-perfume",
  storageBucket: "alh-perfume.firebasestorage.app",
  messagingSenderId: "311171449596",
  appId: "1:311171449596:web:79fe9c849edd41d1c48d79"
};

// Initialize Firebase when available
function initializeFirebase() {
  try {
    if (typeof firebase !== 'undefined') {
      app = firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();
      console.log('Firebase initialized successfully');
    } else {
      console.warn('Firebase not available, using demo mode');
    }
  } catch (error) {
    console.warn('Firebase initialization failed, using demo mode:', error);
  }
}

// Firebase functions - will use global firebase object
const initializeApp = (config) => firebase?.initializeApp ? firebase.initializeApp(config) : null;
const getAuth = (app) => firebase?.auth ? firebase.auth() : null;
const getFirestore = (app) => firebase?.firestore ? firebase.firestore() : null;
const signOut = (auth) => auth?.signOut ? auth.signOut() : Promise.resolve();
const onAuthStateChanged = (auth, callback) => auth?.onAuthStateChanged ? auth.onAuthStateChanged(callback) : callback(null);
const collection = (db, path) => db?.collection ? db.collection(path) : null;
const doc = (db, path, id) => db?.collection ? db.collection(path).doc(id) : null;
const getDoc = (ref) => {
  if (ref?.get) {
    return ref.get();
  } else {
    // Return a mock DocumentSnapshot for demo mode
    return Promise.resolve({
      exists: () => false,
      data: () => null,
      id: 'mock-id'
    });
  }
};
const getDocs = (ref) => ref?.get ? ref.get() : Promise.resolve({ docs: [], size: 0 });
const deleteDoc = (ref) => ref?.delete ? ref.delete() : Promise.resolve();
const updateDoc = (ref, data) => ref?.update ? ref.update(data) : Promise.resolve();
const addDoc = (ref, data) => ref?.add ? ref.add(data) : Promise.resolve();
const setDoc = (ref, data, options) => ref?.set ? ref.set(data, options) : Promise.resolve();
const serverTimestamp = () => firebase?.firestore?.FieldValue?.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : new Date();
const query = (ref, ...constraints) => ref;
const where = (field, op, value) => null;
const orderBy = (field, direction) => null;
const limit = (num) => null;
const onSnapshot = (ref, callback) => {
  if (ref?.onSnapshot) {
    return ref.onSnapshot(callback);
  } else {
    // Return empty snapshot for demo mode
    setTimeout(() => callback({ docs: [] }), 100);
    return () => {}; // unsubscribe function
  }
};

// Global state
let currentUser = null;
let users = [];
let orders = [];
let products = [];
let staff = [];
let paymentRequests = [];

let orderFilters = {
  status: 'all',
  search: '',
  startDate: null,
  endDate: null
};
let filteredOrders = [];
let currentOrderPage = 1;
let orderPageSize = 25;

// Payment request filters
let paymentRequestFilters = {
  status: 'all',
  search: '',
  startDate: null,
  endDate: null
};
let filteredPaymentRequests = [];

// QR Scanner variables
let html5QrcodeScanner = null;
let isScanning = false;

// Check QR scanner library availability
function checkQRScannerLibrary() {
  if (typeof Html5QrcodeScanner === 'undefined') {
    console.warn('Html5QrcodeScanner library not loaded');
    return false;
  }
  return true;
}

// Utility functions
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const showToast = (message, type = 'info') => {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
    type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

const showLoading = (show) => {
  const overlay = document.getElementById('loadingOverlay');
  if (show) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
};

// Navigation
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(section => section.classList.add('hidden'));
  document.getElementById(`${sectionId}-section`).classList.remove('hidden');
  
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('bg-gray-700'));
  document.querySelector(`[data-section="${sectionId}"]`).classList.add('bg-gray-700');
  
  document.getElementById('pageTitle').textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
  window.location.hash = sectionId;
  
  // Load section data
  switch(sectionId) {
    case 'dashboard':
      loadDashboardData();
      break;
    case 'users':
      loadUsers();
      break;
    case 'orders':
      loadOrders();
      break;
    case 'products':
      loadProducts();
      break;
    case 'staff':
      loadStaff();
      loadPaymentRequests();
      break;
    case 'profile':
      loadProfile();
      break;
  }
}

// Dashboard functions
async function loadDashboardData() {
  try {
    showLoading(true);
    
    // Try to load real data from Firebase, fallback to demo data
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      document.getElementById('totalUsers').textContent = usersSnapshot.size;

      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const ordersData = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      document.getElementById('totalOrders').textContent = ordersData.length;

      const totalRevenue = ordersData.reduce((sum, order) => sum + (order.total || 0), 0);
      document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toLocaleString()}`;
    } catch (firebaseError) {
      console.warn('Firebase not available, using demo data:', firebaseError);
      // Use demo data
      document.getElementById('totalUsers').textContent = '156';
      document.getElementById('totalOrders').textContent = '89';
      document.getElementById('totalRevenue').textContent = '₹45,230';
    }

    document.getElementById('growthRate').textContent = '+12.5%';
    
    loadRecentActivity();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showToast('Error loading dashboard data: ' + error.message, 'error');
    // Fallback to demo data
    document.getElementById('totalUsers').textContent = '156';
    document.getElementById('totalOrders').textContent = '89';
    document.getElementById('totalRevenue').textContent = '₹45,230';
    document.getElementById('growthRate').textContent = '+12.5%';
  } finally {
    showLoading(false);
  }
}

async function loadRecentActivity() {
  try {
    const recentActivityDiv = document.getElementById('recentActivity');
    recentActivityDiv.innerHTML = '<div class="w-10 h-10 border-4 border-t-transparent border-primary rounded-full animate-spin mx-auto"></div>';
    
    try {
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5));
      const ordersSnapshot = await getDocs(ordersQuery);
      
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(5));
      const usersSnapshot = await getDocs(usersQuery);
      
      const activities = [];
      
      ordersSnapshot.forEach(doc => {
        const order = { id: doc.id, ...doc.data(), type: 'order' };
        activities.push(order);
      });
      
      usersSnapshot.forEach(doc => {
        const user = { id: doc.id, ...doc.data(), type: 'user' };
        activities.push(user);
      });
      
      activities.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      });
      
      const recentActivities = activities.slice(0, 5);
      
      if (recentActivities.length === 0) {
        throw new Error('No data available');
      }
      
      recentActivityDiv.innerHTML = '';
      recentActivities.forEach(activity => {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'flex items-start py-3 border-b border-gray-100 last:border-0';
        
        let icon, title, description, time;
        
        if (activity.type === 'order') {
          icon = '<i class="fas fa-shopping-cart text-blue-500"></i>';
          title = 'New Order';
          const displayName = ([activity.firstName, activity.lastName].filter(Boolean).join(' ') || activity.email || 'Unknown').trim();
          description = `Order #${activity.id.substring(0, 6)} placed by ${displayName}`;
          time = activity.createdAt?.toDate ? activity.createdAt.toDate().toLocaleString() : 'Unknown time';
        } else {
          icon = '<i class="fas fa-user-plus text-green-500"></i>';
          title = 'New User';
          description = `User ${activity.name || activity.email || 'Unknown'} registered`;
          time = activity.createdAt?.toDate ? activity.createdAt.toDate().toLocaleString() : 'Unknown time';
        }
        
        activityDiv.innerHTML = `
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            ${icon}
          </div>
          <div class="ml-3 flex-1">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-900">${title}</h4>
              <span class="text-xs text-gray-500">${time}</span>
            </div>
            <p class="text-sm text-gray-600 mt-1">${description}</p>
          </div>
        `;
        
        recentActivityDiv.appendChild(activityDiv);
      });
    } catch (firebaseError) {
      // Show demo activity data
      recentActivityDiv.innerHTML = `
        <div class="flex items-start py-3 border-b border-gray-100">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <i class="fas fa-shopping-cart text-blue-500"></i>
          </div>
          <div class="ml-3 flex-1">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-900">New Order</h4>
              <span class="text-xs text-gray-500">${new Date().toLocaleString()}</span>
            </div>
            <p class="text-sm text-gray-600 mt-1">Order #ABC123 placed by John Doe</p>
          </div>
        </div>
        <div class="flex items-start py-3 border-b border-gray-100">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <i class="fas fa-user-plus text-green-500"></i>
          </div>
          <div class="ml-3 flex-1">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-900">New User</h4>
              <span class="text-xs text-gray-500">${new Date().toLocaleString()}</span>
            </div>
            <p class="text-sm text-gray-600 mt-1">User Jane Smith registered</p>
          </div>
        </div>
        <div class="text-center text-gray-500 text-sm mt-4">
          <i class="fas fa-info-circle mr-1"></i>
          Demo data - Connect to Firebase for real data
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading recent activity:', error);
    document.getElementById('recentActivity').innerHTML = '<p class="text-center text-gray-500">Error loading activity</p>';
  }
}

// Users functions
async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="w-10 h-10 border-4 border-t-transparent border-primary rounded-full animate-spin mx-auto"></div></td></tr>';

  try {
    onSnapshot(collection(db, 'users'), (snapshot) => {
      users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderUsersTable(users);
    });
  } catch (error) {
    console.warn('Firebase not available for users, using demo data:', error);
    // Use demo data
    users = [
      {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
        status: 'active',
        createdAt: new Date()
      },
      {
        id: 'user2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'user',
        status: 'active',
        createdAt: new Date()
      }
    ];
    renderUsersTable(users);
  }
}

function renderUsersTable(usersData) {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = '';

  if (usersData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No users found</td></tr>';
    return;
  }

  usersData.forEach(user => {
    let joinDate = 'N/A';
    try {
      if (user.createdAt) {
        joinDate = user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : new Date(user.createdAt).toLocaleDateString();
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }

    const status = user.status || 'active';
    const role = user.role || 'user';

    const tr = document.createElement('tr');
    tr.className = 'table-row';
    tr.innerHTML = `
      <td class="px-6 py-4">
        <div class="flex items-center">
          <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <i class="fas fa-user text-gray-600"></i>
          </div>
          <div class="ml-3">
            <div class="text-sm font-medium text-gray-900">${user.name || 'N/A'}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 text-sm text-gray-900">${user.email || 'N/A'}</td>
      <td class="px-6 py-4 text-sm text-gray-900">${role.charAt(0).toUpperCase() + role.slice(1)}</td>
      <td class="px-6 py-4">
        <span class="status-badge ${status === 'active' ? 'bg-green-100 text-green-800' : (status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')}">
          ${status}
        </span>
      </td>
      <td class="px-6 py-4 text-sm text-gray-900">${joinDate}</td>
      <td class="px-6 py-4 text-sm">
        <button onclick="editUser('${user.id}')" class="text-primary hover:text-primary-dark mr-2">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="deleteUser('${user.id}')" class="text-red-600 hover:text-red-800">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Orders functions
async function loadOrders() {
  const tbody = document.getElementById('ordersTableBody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="w-10 h-10 border-4 border-t-transparent border-primary rounded-full animate-spin mx-auto"></div></td></tr>';

  try {
    onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      applyOrderFilters();
    });
  } catch (error) {
    console.warn('Firebase not available for orders, using demo data:', error);
    // Use demo data
    orders = [
      {
        id: 'order1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+91 9876543210',
        total: 299,
        status: 'Processing',
        createdAt: new Date(),
        address: '123 Main St',
        city: 'Mumbai',
        district: 'Maharashtra',
        zip: '400001',
        items: [
          { name: 'RAMZAN Perfume', quantity: 1, price: 299 }
        ]
      },
      {
        id: 'order2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '+91 9876543211',
        total: 199,
        status: 'Delivered',
        createdAt: new Date(),
        address: '456 Oak Ave',
        city: 'Delhi',
        district: 'Delhi',
        zip: '110001',
        items: [
          { name: 'Mystic Rose Attar', quantity: 1, price: 199 }
        ]
      }
    ];
    applyOrderFilters();
  }
}

function matchesOrderFilters(order) {
  if (orderFilters.status !== 'all' && (order.status || '') !== orderFilters.status) return false;

  const created = (() => {
    try {
      return order.createdAt?.toDate ? order.createdAt.toDate() : (order.createdAt ? new Date(order.createdAt) : null);
    } catch { return null; }
  })();
  if (orderFilters.startDate) {
    const start = new Date(orderFilters.startDate);
    if (!created || created < new Date(start.setHours(0,0,0,0))) return false;
  }
  if (orderFilters.endDate) {
    const end = new Date(orderFilters.endDate);
    if (!created || created > new Date(end.setHours(23,59,59,999))) return false;
  }

  const q = (orderFilters.search || '').trim().toLowerCase();
  if (!q) return true;

  const parts = [
    order.id,
    order.firstName,
    order.lastName,
    order.email,
    order.phone,
    order.address,
    order.city,
    order.district,
    order.zip,
    order.status
  ].filter(Boolean).map(v => String(v).toLowerCase());

  return parts.some(v => v.includes(q));
}

function paginate(arr, page, size) {
  const total = arr.length;
  const start = (page - 1) * size;
  const end = Math.min(start + size, total);
  return { slice: arr.slice(start, end), start: start + 1, end, total, hasPrev: page > 1, hasNext: end < total };
}

function applyOrderFilters() {
  filteredOrders = orders.filter(matchesOrderFilters);
  const { slice, start, end, total, hasPrev, hasNext } = paginate(filteredOrders, currentOrderPage, orderPageSize);
  if (slice.length === 0 && currentOrderPage > 1) {
    currentOrderPage = 1;
    return applyOrderFilters();
  }
  renderOrdersTable(slice);
  
  const elFrom = document.getElementById('ordersShowingFrom');
  const elTo = document.getElementById('ordersShowingTo');
  const elTotal = document.getElementById('ordersTotal');
  const prevBtn = document.getElementById('ordersPrevPage');
  const nextBtn = document.getElementById('ordersNextPage');
  if (elFrom) elFrom.textContent = total ? start : 0;
  if (elTo) elTo.textContent = end;
  if (elTotal) elTotal.textContent = total;
  if (prevBtn) prevBtn.disabled = !hasPrev;
  if (nextBtn) nextBtn.disabled = !hasNext;
}

function renderOrdersTable(ordersPageData) {
  const tbody = document.getElementById('ordersTableBody');
  tbody.innerHTML = '';

  if (!ordersPageData.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No orders found</td></tr>';
    return;
  }

  ordersPageData.forEach(order => {
    let orderDate = 'N/A';
    try {
      if (order.createdAt) {
        orderDate = order.createdAt.toDate ? order.createdAt.toDate().toLocaleDateString() : new Date(order.createdAt).toLocaleDateString();
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }

    const tr = document.createElement('tr');
    tr.className = 'table-row';
    tr.innerHTML = `
      <td class="px-6 py-4 text-sm font-medium text-gray-900">${order.id.substring(0, 8)}...</td>
      <td class="px-6 py-4 text-sm text-gray-900">${([order.firstName, order.lastName].filter(Boolean).join(' ') || order.email || 'N/A').trim()}</td>
      <td class="px-6 py-4 text-sm text-gray-900">₹${order.total?.toLocaleString() || '0'}</td>
      <td class="px-6 py-4">
        <select class="px-2 py-1 border border-gray-300 rounded text-sm"
                onchange="updateOrderStatusDropdown('${order.id}', this.value)">
          ${['Pending Payment','COD - Placed','Order Placed','Processing','Ready for Delivery','Shipped','Out for Delivery','Delivered','Cancelled','Paid'].map(s => `
            <option value="${s}" ${((order.status || '') === s) ? 'selected' : ''}>${s}</option>
          `).join('')}
        </select>
      </td>
      <td class="px-6 py-4 text-sm text-gray-900">${orderDate}</td>
      <td class="px-6 py-4 text-sm">
        <button title="View" onclick="viewOrder('${order.id}')" class="text-primary hover:text-primary-dark mr-2">
          <i class="fas fa-eye"></i>
        </button>
        <button title="Tracking" onclick="updateTracking('${order.id}')" class="text-indigo-600 hover:text-indigo-800 mr-2">
          <i class="fas fa-truck"></i>
        </button>
        ${((order.status === 'Pending Payment') && (order.payment?.method === 'online')) ? `
          <button title="Mark Paid" onclick="markOrderPaid('${order.id}')" class="text-green-600 hover:text-green-800 mr-2">
            <i class="fas fa-check-circle"></i>
          </button>
        ` : ''}
        <button title="Copy address" onclick="copyAddress('${order.id}')" class="text-gray-600 hover:text-gray-800 mr-2">
          <i class="fas fa-copy"></i>
        </button>
        <button title="Delete" onclick="deleteOrder('${order.id}')" class="text-red-600 hover:text-red-800">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Products functions
async function loadProducts() {
  const tbody = document.getElementById('productsTableBody');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><div class="w-10 h-10 border-4 border-t-transparent border-primary rounded-full animate-spin mx-auto"></div></td></tr>';

  products = [
    {
      id: 'ramzan-001',
      name: 'RAMZAN',
      category: 'perfume',
      price: 299,
      stock: 50,
      description: 'Experience the scent of confidence and celebration.',
      likes: 125,
      status: 'active',
      imageUrl: ''
    },
    {
      id: 'rose-002',
      name: 'Mystic Rose',
      category: 'attar',
      price: 199,
      stock: 30,
      description: 'A floral fragrance that captures the essence of fresh roses.',
      likes: 89,
      status: 'active',
      imageUrl: ''
    },
    {
      id: 'ocean-003',
      name: 'Ocean Breeze',
      category: 'spray',
      price: 349,
      stock: 0,
      description: 'A refreshing scent reminiscent of sea breezes.',
      likes: 67,
      status: 'inactive',
      imageUrl: ''
    }
  ];
  
  renderProductsTable(products);
  document.getElementById('productCount').textContent = products.length;
}

function renderProductsTable(productsData) {
  const tbody = document.getElementById('productsTableBody');
  tbody.innerHTML = '';

  if (productsData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">No products found</td></tr>';
    return;
  }

  productsData.forEach(product => {
    const tr = document.createElement('tr');
    tr.className = 'table-row';
    tr.innerHTML = `
      <td class="px-6 py-4">
        <div class="flex items-center">
          <div class="w-10 h-10 rounded-md bg-gray-300 flex items-center justify-center">
            ${product.imageUrl ?
              `<img src="${product.imageUrl}" alt="${product.name}" class="w-full h-full object-cover">` :
              '<i class="fas fa-box text-gray-600"></i>'}
          </div>
          <div class="ml-3">
            <div class="text-sm font-medium text-gray-900">${product.name || 'N/A'}</div>
            <div class="text-xs text-gray-500">${product.description || ''}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 text-sm text-gray-900">${product.category || 'N/A'}</td>
      <td class="px-6 py-4 text-sm text-gray-900">₹${product.price || '0'}</td>
      <td class="px-6 py-4 text-sm text-gray-900">
        <span class="${product.stock > 0 ? 'text-green-600' : 'text-red-600'}">
          ${product.stock > 0 ? product.stock : 'Out of Stock'}
        </span>
      </td>
      <td class="px-6 py-4 text-sm text-gray-900">${product.likes || 0}</td>
      <td class="px-6 py-4">
        <span class="status-badge ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
          ${product.status || 'N/A'}
        </span>
      </td>
      <td class="px-6 py-4 text-sm">
        <button onclick="editProduct('${product.id}')" class="text-primary hover:text-primary-dark mr-2">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="deleteProduct('${product.id}')" class="text-red-600 hover:text-red-800">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Staff functions
async function loadStaff() {
  const tbody = document.getElementById('staffTableBody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="w-10 h-10 border-4 border-t-transparent border-primary rounded-full animate-spin mx-auto"></div></td></tr>';

  try {
    onSnapshot(collection(db, 'staff'), (snapshot) => {
      staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderStaffTable(staff);
    });
  } catch (error) {
    console.warn('Firebase not available for staff:', error);
    // Initialize empty array when Firebase is not available
    staff = [];
    renderStaffTable(staff);
  }
}

function renderStaffTable(staffData) {
  const tbody = document.getElementById('staffTableBody');
  tbody.innerHTML = '';

  if (staffData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No staff found</td></tr>';
    return;
  }

  staffData.forEach(staffMember => {
    let lastUpdated = 'N/A';
    try {
      if (staffMember.updatedAt) {
        lastUpdated = staffMember.updatedAt.toDate ?
          staffMember.updatedAt.toDate().toLocaleString() :
          new Date(staffMember.updatedAt).toLocaleString();
      } else if (staffMember.createdAt) {
        lastUpdated = staffMember.createdAt.toDate ?
          staffMember.createdAt.toDate().toLocaleString() :
          new Date(staffMember.createdAt).toLocaleString();
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }

    const tr = document.createElement('tr');
    tr.className = 'table-row';
    tr.innerHTML = `
      <td class="px-6 py-4 text-sm font-medium text-gray-900">${staffMember.id}</td>
      <td class="px-6 py-4 text-sm text-gray-900">${staffMember.name || 'N/A'}</td>
      <td class="px-6 py-4 text-sm text-gray-900">${staffMember.phone || 'N/A'}</td>
      <td class="px-6 py-4 text-sm font-semibold text-green-600">₹${(staffMember.wageBalance || staffMember.wagebalance || 0).toLocaleString()}</td>
      <td class="px-6 py-4 text-sm text-gray-900">${lastUpdated}</td>
      <td class="px-6 py-4 text-sm">
        <button onclick="quickAddMoney('${staffMember.id}')" class="text-primary hover:text-primary-dark mr-2" title="Quick Add Money">
          <i class="fas fa-plus-circle"></i>
        </button>
        <button onclick="viewStaffPayments('${staffMember.id}')" class="text-blue-600 hover:text-blue-800" title="View Payment History">
          <i class="fas fa-history"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // Update total balance section after rendering staff table
  updateTotalBalanceSection(staffData);
}

// Function to update total balance section
function updateTotalBalanceSection(staffData) {
  try {
    // Calculate totals
    const totalBalance = staffData.reduce((sum, staffMember) => {
      return sum + (staffMember.wageBalance || staffMember.wagebalance || 0);
    }, 0);
    
    const totalStaff = staffData.length;
    
    // Update the display elements
    const totalBalanceElement = document.getElementById('totalStaffBalance');
    const totalStaffElement = document.getElementById('totalStaffCount');
    
    if (totalBalanceElement) {
      totalBalanceElement.textContent = `₹${totalBalance.toLocaleString()}`;
    }
    
    if (totalStaffElement) {
      totalStaffElement.textContent = totalStaff.toString();
    }
    
    console.log('Total balance section updated:', { totalBalance, totalStaff });
  } catch (error) {
    console.error('Error updating total balance section:', error);
  }
}

async function loadPaymentRequests() {
  const tbody = document.getElementById('paymentRequestsTableBody');
  tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><div class="w-10 h-10 border-4 border-t-transparent border-primary rounded-full animate-spin mx-auto"></div></td></tr>';

  try {
    onSnapshot(query(collection(db, 'paymentRequests'), orderBy('createdAt', 'desc')), (snapshot) => {
      paymentRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      applyPaymentRequestFilters();
    });
  } catch (error) {
    console.warn('Firebase not available for payment requests:', error);
    // Initialize empty array when Firebase is not available
    paymentRequests = [];
    applyPaymentRequestFilters();
  }
}

function matchesPaymentRequestFilters(request) {
  if (paymentRequestFilters.status !== 'all' && (request.status || '') !== paymentRequestFilters.status) return false;

  const created = (() => {
    try {
      return request.createdAt?.toDate ? request.createdAt.toDate() : (request.createdAt ? new Date(request.createdAt) : null);
    } catch { return null; }
  })();
  if (paymentRequestFilters.startDate) {
    const start = new Date(paymentRequestFilters.startDate);
    if (!created || created < new Date(start.setHours(0,0,0,0))) return false;
  }
  if (paymentRequestFilters.endDate) {
    const end = new Date(paymentRequestFilters.endDate);
    if (!created || created > new Date(end.setHours(23,59,59,999))) return false;
  }

  const q = (paymentRequestFilters.search || '').trim().toLowerCase();
  if (!q) return true;

  const parts = [
    request.staffCode,
    request.staffName,
    request.phoneNumber,
    request.phone,
    request.upiId,
    request.status
  ].filter(Boolean).map(v => String(v).toLowerCase());

  return parts.some(v => v.includes(q));
}

function applyPaymentRequestFilters() {
  filteredPaymentRequests = paymentRequests.filter(matchesPaymentRequestFilters);
  renderPaymentRequestsTable(filteredPaymentRequests);
}

function renderPaymentRequestsTable(requestsData) {
  const tbody = document.getElementById('paymentRequestsTableBody');
  tbody.innerHTML = '';

  if (requestsData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500">No payment requests found</td></tr>';
    return;
  }

  requestsData.forEach(request => {
    let requestDate = 'N/A';
    try {
      if (request.createdAt) {
        requestDate = request.createdAt.toDate ?
          request.createdAt.toDate().toLocaleString() :
          new Date(request.createdAt).toLocaleString();
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }

    const tr = document.createElement('tr');
    tr.className = 'table-row';
    
    let statusBadge = '';
    let actionButtons = '';
    
    if (request.status === 'pending') {
      statusBadge = '<span class="status-badge bg-yellow-100 text-yellow-800">Pending</span>';
      actionButtons = `
        <button onclick="payViaUPI('${request.id}')" class="text-blue-600 hover:text-blue-800 mr-2" title="Pay via UPI">
          <i class="fas fa-credit-card"></i>
        </button>
        <button onclick="approvePaymentRequest('${request.id}')" class="text-green-600 hover:text-green-800 mr-2" title="Approve">
          <i class="fas fa-check-circle"></i>
        </button>
        <button onclick="rejectPaymentRequest('${request.id}')" class="text-red-600 hover:text-red-800" title="Reject">
          <i class="fas fa-times-circle"></i>
        </button>
      `;
    } else if (request.status === 'approved') {
      statusBadge = '<span class="status-badge bg-green-100 text-green-800">Approved</span>';
      actionButtons = '<span class="text-green-600 text-sm">Approved</span>';
    } else if (request.status === 'rejected') {
      statusBadge = '<span class="status-badge bg-red-100 text-red-800">Rejected</span>';
      actionButtons = '<span class="text-red-600 text-sm">Rejected</span>';
    }

    tr.innerHTML = `
      <td class="px-6 py-4 text-sm font-medium text-gray-900">${request.staffCode}</td>
      <td class="px-6 py-4 text-sm text-gray-900">${request.staffName || 'N/A'}</td>
      <td class="px-6 py-4 text-sm text-gray-900">${request.phoneNumber || request.phone || 'N/A'}</td>
      <td class="px-6 py-4 text-sm text-gray-900 font-mono">${request.upiId || 'N/A'}</td>
      <td class="px-6 py-4 text-sm font-semibold text-green-600">₹${(request.amount || 0).toLocaleString()}</td>
      <td class="px-6 py-4">${statusBadge}</td>
      <td class="px-6 py-4 text-sm text-gray-900">${requestDate}</td>
      <td class="px-6 py-4 text-sm">${actionButtons}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Profile functions
function loadProfile() {
  if (currentUser) {
    const profileNameEl = document.getElementById('profileName');
    const profileEmailEl = document.getElementById('profileEmail');
    const profileRoleEl = document.getElementById('profileRole');
    const profileJoinDateEl = document.getElementById('profileJoinDate');
    const adminNameEl = document.getElementById('adminName');
    const adminEmailEl = document.getElementById('adminEmail');
    const adminRoleEl = document.getElementById('adminRole');
    const adminMemberSinceEl = document.getElementById('adminMemberSince');
    
    if (profileNameEl) profileNameEl.textContent = currentUser.displayName || 'Admin User';
    if (profileEmailEl) profileEmailEl.textContent = currentUser.email || 'admin@example.com';
    if (profileRoleEl) profileRoleEl.textContent = 'Administrator';
    if (profileJoinDateEl) profileJoinDateEl.textContent = new Date().toLocaleDateString();
    
    if (adminNameEl) adminNameEl.value = currentUser.displayName || 'Admin User';
    if (adminEmailEl) adminEmailEl.value = currentUser.email || 'admin@example.com';
    if (adminRoleEl) adminRoleEl.value = 'Administrator';
    if (adminMemberSinceEl) adminMemberSinceEl.value = new Date().toLocaleDateString();
  }
}

// Authentication functions
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    signOut(auth).then(() => {
      window.location.href = 'admin.html';
    }).catch((error) => {
      console.error('Error signing out:', error);
      showToast('Error signing out: ' + error.message, 'error');
    });
  }
}

// User management functions
function editUser(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) {
    showToast('User not found', 'error');
    return;
  }
  
  const newName = prompt('Enter new name:', user.name || '');
  if (newName === null) return;
  
  const newRole = prompt('Enter role (user/admin):', user.role || 'user');
  if (newRole === null) return;
  
  const newStatus = prompt('Enter status (active/inactive/pending):', user.status || 'active');
  if (newStatus === null) return;
  
  updateDoc(doc(db, 'users', userId), {
    name: newName.trim(),
    role: newRole.trim(),
    status: newStatus.trim(),
    updatedAt: serverTimestamp()
  }).then(() => {
    showToast('User updated successfully', 'success');
  }).catch((error) => {
    console.error('Error updating user:', error);
    showToast('Error updating user: ' + error.message, 'error');
  });
}

function deleteUser(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) {
    showToast('User not found', 'error');
    return;
  }
  
  if (confirm(`Are you sure you want to delete user "${user.name || user.email}"?`)) {
    deleteDoc(doc(db, 'users', userId)).then(() => {
      showToast('User deleted successfully', 'success');
    }).catch((error) => {
      console.error('Error deleting user:', error);
      showToast('Error deleting user: ' + error.message, 'error');
    });
  }
}

// Order management functions
function updateOrderStatusDropdown(orderId, newStatus) {
  updateDoc(doc(db, 'orders', orderId), {
    status: newStatus,
    updatedAt: serverTimestamp()
  }).then(() => {
    showToast('Order status updated successfully', 'success');
  }).catch((error) => {
    console.error('Error updating order status:', error);
    showToast('Error updating order status: ' + error.message, 'error');
  });
}

function viewOrder(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    showToast('Order not found', 'error');
    return;
  }
  
  const modal = document.getElementById('orderModal');
  const modalContent = document.getElementById('orderModalContent');
  
  let orderDate = 'N/A';
  try {
    if (order.createdAt) {
      orderDate = order.createdAt.toDate ? 
        order.createdAt.toDate().toLocaleString() : 
        new Date(order.createdAt).toLocaleString();
    }
  } catch (e) {
    console.error('Error formatting date:', e);
  }
  
  const customerName = [order.firstName, order.lastName].filter(Boolean).join(' ') || order.email || 'N/A';
  const items = order.items || [];
  
  modalContent.innerHTML = `
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center p-6 border-b">
        <h2 class="text-xl font-semibold">Order Details</h2>
        <button onclick="closeModal('orderModal')" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="p-6 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="text-lg font-medium mb-4">Order Information</h3>
            <div class="space-y-2">
              <p><strong>Order ID:</strong> ${order.id}</p>
              <p><strong>Status:</strong> <span class="px-2 py-1 rounded text-sm bg-blue-100 text-blue-800">${order.status || 'N/A'}</span></p>
              <p><strong>Date:</strong> ${orderDate}</p>
              <p><strong>Total:</strong> ₹${(order.total || 0).toLocaleString()}</p>
              <p><strong>Payment Method:</strong> ${order.payment?.method || 'N/A'}</p>
            </div>
          </div>
          
          <div>
            <h3 class="text-lg font-medium mb-4">Customer Information</h3>
            <div class="space-y-2">
              <p><strong>Name:</strong> ${customerName}</p>
              <p><strong>Email:</strong> ${order.email || 'N/A'}</p>
              <p><strong>Phone:</strong> ${order.phone || 'N/A'}</p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 class="text-lg font-medium mb-4">Shipping Address</h3>
          <div class="bg-gray-50 p-4 rounded">
            <p>${order.address || 'N/A'}</p>
            <p>${order.city || ''} ${order.district || ''} ${order.zip || ''}</p>
          </div>
        </div>
        
        <div>
          <h3 class="text-lg font-medium mb-4">Order Items</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full border border-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left">Product</th>
                  <th class="px-4 py-2 text-left">Quantity</th>
                  <th class="px-4 py-2 text-left">Price</th>
                  <th class="px-4 py-2 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr class="border-t">
                    <td class="px-4 py-2">${item.name || 'N/A'}</td>
                    <td class="px-4 py-2">${item.quantity || 0}</td>
                    <td class="px-4 py-2">₹${(item.price || 0).toLocaleString()}</td>
                    <td class="px-4 py-2">₹${((item.price || 0) * (item.quantity || 0)).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        
        ${order.trackingNumber ? `
          <div>
            <h3 class="text-lg font-medium mb-4">Tracking Information</h3>
            <div class="bg-gray-50 p-4 rounded">
              <p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>
              ${order.trackingUrl ? `<p><strong>Track:</strong> <a href="${order.trackingUrl}" target="_blank" class="text-blue-600 hover:underline">View Tracking</a></p>` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
}

function updateTracking(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    showToast('Order not found', 'error');
    return;
  }
  
  const trackingNumber = prompt('Enter tracking number:', order.trackingNumber || '');
  if (trackingNumber === null) return;
  
  const trackingUrl = prompt('Enter tracking URL (optional):', order.trackingUrl || '');
  if (trackingUrl === null) return;
  
  const updateData = {
    trackingNumber: trackingNumber.trim(),
    updatedAt: serverTimestamp()
  };
  
  if (trackingUrl.trim()) {
    updateData.trackingUrl = trackingUrl.trim();
  }
  
  updateDoc(doc(db, 'orders', orderId), updateData).then(() => {
    showToast('Tracking information updated successfully', 'success');
  }).catch((error) => {
    console.error('Error updating tracking:', error);
    showToast('Error updating tracking: ' + error.message, 'error');
  });
}

function markOrderPaid(orderId) {
  if (confirm('Mark this order as paid?')) {
    updateDoc(doc(db, 'orders', orderId), {
      status: 'Paid',
      'payment.status': 'completed',
      updatedAt: serverTimestamp()
    }).then(() => {
      showToast('Order marked as paid', 'success');
    }).catch((error) => {
      console.error('Error marking order as paid:', error);
      showToast('Error marking order as paid: ' + error.message, 'error');
    });
  }
}

function copyAddress(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    showToast('Order not found', 'error');
    return;
  }
  
  const address = `${order.firstName || ''} ${order.lastName || ''}
${order.phone || ''}
${order.address || ''}
${order.city || ''} ${order.district || ''} ${order.zip || ''}`.trim();
  
  navigator.clipboard.writeText(address).then(() => {
    showToast('Address copied to clipboard', 'success');
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = address;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast('Address copied to clipboard', 'success');
  });
}

function deleteOrder(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    showToast('Order not found', 'error');
    return;
  }
  
  if (confirm(`Are you sure you want to delete order #${orderId.substring(0, 8)}?`)) {
    deleteDoc(doc(db, 'orders', orderId)).then(() => {
      showToast('Order deleted successfully', 'success');
    }).catch((error) => {
      console.error('Error deleting order:', error);
      showToast('Error deleting order: ' + error.message, 'error');
    });
  }
}

// Order filtering functions
function filterOrdersByStatus(status) {
  orderFilters.status = status;
  currentOrderPage = 1;
  applyOrderFilters();
}

function searchOrders() {
  const searchInput = document.getElementById('orderSearch');
  orderFilters.search = searchInput.value;
  currentOrderPage = 1;
  applyOrderFilters();
}

function filterOrdersByDate() {
  const startDate = document.getElementById('orderStartDate').value;
  const endDate = document.getElementById('orderEndDate').value;
  
  orderFilters.startDate = startDate;
  orderFilters.endDate = endDate;
  currentOrderPage = 1;
  applyOrderFilters();
}

function clearOrderFilters() {
  orderFilters = {
    status: 'all',
    search: '',
    startDate: null,
    endDate: null
  };
  
  document.getElementById('orderSearch').value = '';
  document.getElementById('orderStartDate').value = '';
  document.getElementById('orderEndDate').value = '';
  document.getElementById('orderStatusFilter').value = 'all';
  
  currentOrderPage = 1;
  applyOrderFilters();
}

function previousOrderPage() {
  if (currentOrderPage > 1) {
    currentOrderPage--;
    applyOrderFilters();
  }
}

function nextOrderPage() {
  const totalPages = Math.ceil(filteredOrders.length / orderPageSize);
  if (currentOrderPage < totalPages) {
    currentOrderPage++;
    applyOrderFilters();
  }
}

// Product management functions
function editProduct(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) {
    showToast('Product not found', 'error');
    return;
  }
  
  const modal = document.getElementById('productModal');
  const modalContent = document.getElementById('productModalContent');
  
  modalContent.innerHTML = `
    <div class="bg-white rounded-lg max-w-2xl w-full">
      <div class="flex justify-between items-center p-6 border-b">
        <h2 class="text-xl font-semibold">Edit Product</h2>
        <button onclick="closeModal('productModal')" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <form id="editProductForm" class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input type="text" id="productName" value="${product.name || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select id="productCategory" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="perfume" ${product.category === 'perfume' ? 'selected' : ''}>Perfume</option>
            <option value="attar" ${product.category === 'attar' ? 'selected' : ''}>Attar</option>
            <option value="spray" ${product.category === 'spray' ? 'selected' : ''}>Spray</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
          <input type="number" id="productPrice" value="${product.price || 0}" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Stock</label>
          <input type="number" id="productStock" value="${product.stock || 0}" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea id="productDescription" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">${product.description || ''}</textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select id="productStatus" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="active" ${product.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${product.status === 'inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
        
        <div class="flex justify-end space-x-3 pt-4">
          <button type="button" onclick="closeModal('productModal')" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `;
  
  modal.classList.remove('hidden');
  
  document.getElementById('editProductForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const updatedProduct = {
      name: document.getElementById('productName').value.trim(),
      category: document.getElementById('productCategory').value,
      price: parseFloat(document.getElementById('productPrice').value) || 0,
      stock: parseInt(document.getElementById('productStock').value) || 0,
      description: document.getElementById('productDescription').value.trim(),
      status: document.getElementById('productStatus').value
    };
    
    // Update the product in the local array (since we're using static data)
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex !== -1) {
      products[productIndex] = { ...products[productIndex], ...updatedProduct };
      renderProductsTable(products);
      closeModal('productModal');
      showToast('Product updated successfully', 'success');
    }
  });
}

function deleteProduct(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) {
    showToast('Product not found', 'error');
    return;
  }
  
  if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
    products = products.filter(p => p.id !== productId);
    renderProductsTable(products);
    document.getElementById('productCount').textContent = products.length;
    showToast('Product deleted successfully', 'success');
  }
}

// Staff management functions
function quickAddMoney(staffId) {
  const staffMember = staff.find(s => s.id === staffId);
  if (!staffMember) {
    showToast('Staff member not found', 'error');
    return;
  }
  
  const amount = prompt(`Add money to ${staffMember.name}'s account:`, '');
  if (amount === null || amount.trim() === '') return;
  
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    showToast('Please enter a valid amount', 'error');
    return;
  }
  
  const newBalance = (staffMember.wageBalance || staffMember.wagebalance || 0) + amountNum;
  
  updateDoc(doc(db, 'staff', staffId), {
    wageBalance: newBalance,
    wagebalance: newBalance, // Keep for backward compatibility
    updatedAt: serverTimestamp()
  }).then(() => {
    // Update local staff array
    const staffIndex = staff.findIndex(s => s.id === staffId);
    if (staffIndex !== -1) {
      staff[staffIndex].wageBalance = newBalance;
      staff[staffIndex].wagebalance = newBalance;
    }
    
    // Update total balance section
    updateTotalBalanceSection(staff);
    
    showToast(`₹${amountNum} added to ${staffMember.name}'s account`, 'success');
  }).catch((error) => {
    console.error('Error adding money:', error);
    showToast('Error adding money: ' + error.message, 'error');
  });
}

function viewStaffPayments(staffId) {
  const staffMember = staff.find(s => s.id === staffId);
  if (!staffMember) {
    showToast('Staff member not found', 'error');
    return;
  }
  
  const modal = document.getElementById('staffPaymentModal');
  const modalContent = document.getElementById('staffPaymentModalContent');
  
  modalContent.innerHTML = `
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center p-6 border-b">
        <h2 class="text-xl font-semibold">Payment History - ${staffMember.name}</h2>
        <button onclick="closeModal('staffPaymentModal')" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="p-6">
        <div class="mb-6">
          <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="text-lg font-medium text-blue-900">Current Balance</h3>
            <p class="text-2xl font-bold text-blue-600">₹${(staffMember.wageBalance || staffMember.wagebalance || 0).toLocaleString()}</p>
          </div>
        </div>
        
        <div class="text-center text-gray-500 py-8">
          <i class="fas fa-history text-4xl mb-4"></i>
          <p>Payment history feature coming soon</p>
        </div>
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
}

function approvePaymentRequest(requestId) {
  const request = paymentRequests.find(r => r.id === requestId);
  if (!request) {
    showToast('Payment request not found', 'error');
    return;
  }
  
  if (confirm(`Approve payment of ₹${request.amount} to ${request.staffName}?`)) {
    // Find staff member and calculate new balance
    const staffMember = staff.find(s => s.id === request.staffCode);
    if (!staffMember) {
      showToast('Staff member not found', 'error');
      return;
    }
    
    const newBalance = Math.max(0, (staffMember.wagebalance || 0) - request.amount);
    
    // Update payment request status
    updateDoc(doc(db, 'paymentRequests', requestId), {
      status: 'approved',
      approvedAt: serverTimestamp(),
      approvedBy: currentUser?.email || 'admin'
    }).then(() => {
      // Deduct amount from staff balance
      return updateDoc(doc(db, 'staff', request.staffCode), {
        wageBalance: newBalance,
        wagebalance: newBalance, // Keep for backward compatibility
        updatedAt: serverTimestamp()
      });
    }).then(() => {
      // Update local staff array
      const staffIndex = staff.findIndex(s => s.id === request.staffCode);
      if (staffIndex !== -1) {
        staff[staffIndex].wageBalance = newBalance;
        staff[staffIndex].wagebalance = newBalance;
      }
      
      // Update total balance section
      updateTotalBalanceSection(staff);
      
      showToast('Payment request approved successfully', 'success');
    }).catch((error) => {
      console.error('Error approving payment request:', error);
      showToast('Error approving payment request: ' + error.message, 'error');
    });
  }
}

function rejectPaymentRequest(requestId) {
  const request = paymentRequests.find(r => r.id === requestId);
  if (!request) {
    showToast('Payment request not found', 'error');
    return;
  }
  
  const reason = prompt('Enter rejection reason (optional):');
  if (reason === null) return;
  
  const updateData = {
    status: 'rejected',
    rejectedAt: serverTimestamp(),
    rejectedBy: currentUser?.email || 'admin'
  };
  
  if (reason.trim()) {
    updateData.rejectionReason = reason.trim();
  }
  
  updateDoc(doc(db, 'paymentRequests', requestId), updateData).then(() => {
    showToast('Payment request rejected', 'success');
  }).catch((error) => {
    console.error('Error rejecting payment request:', error);
    showToast('Error rejecting payment request: ' + error.message, 'error');
  });
}

// UPI Payment function
function payViaUPI(requestId) {
  const request = paymentRequests.find(r => r.id === requestId);
  if (!request) {
    showToast('Payment request not found', 'error');
    return;
  }
  
  if (request.status !== 'pending') {
    showToast('Only pending payment requests can be paid', 'error');
    return;
  }
  // Require explicit UPI ID on the request
  if (!request.upiId) {
    showToast('UPI ID not found for this payment request', 'error');
    return;
  }

  // Create UPI payment URL using the provided UPI ID
  const upiUrl = createUPIPaymentURL(request.upiId, request.amount, request.staffName, `Payment for ${request.staffCode}`);
  
  // Show confirmation dialog
  const confirmMessage = `Pay ₹${request.amount} to ${request.staffName} (${request.upiId})?`;
  if (confirm(confirmMessage)) {
    try {
      // Try to open UPI app
      window.open(upiUrl, '_blank');
      
      // Show success message and ask if payment was completed
      setTimeout(() => {
        if (confirm('Did you complete the payment? Click OK to mark as approved, Cancel to keep as pending.')) {
          approvePaymentRequest(requestId);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error opening UPI app:', error);
      showToast('Error opening UPI app. Please try again.', 'error');
    }
  }
}

function createUPIPaymentURL(upiId, amount, payeeName, note) {
  // Create UPI payment URL following UPI deep linking standards
  const params = new URLSearchParams({
    pa: upiId,                    // Payee Address (UPI ID)
    pn: payeeName,               // Payee Name
    am: amount.toString(),       // Amount
    cu: 'INR',                   // Currency
    tn: note || 'Payment'        // Transaction Note
  });
  
  // UPI URL format: upi://pay?pa=<UPI_ID>&pn=<NAME>&am=<AMOUNT>&cu=INR&tn=<NOTE>
  return `upi://pay?${params.toString()}`;
}

// WhatsApp redirection helper
function contactViaWhatsApp(requestId) {
  try {
    const request = paymentRequests.find(r => r.id === requestId);
    if (!request) {
      showToast('Payment request not found', 'error');
      return;
    }

    const rawPhone = (request.phoneNumber || request.phone || '').toString();
    if (!rawPhone) {
      showToast('Phone number not available for this request', 'error');
      return;
    }

    // Keep digits only
    let digits = rawPhone.replace(/\D+/g, '');
    // If appears to be 10-digit Indian number, prepend country code 91
    if (digits.length === 10) {
      digits = '91' + digits;
    }
    if (digits.length < 11) {
      showToast('Invalid phone number for WhatsApp', 'error');
      return;
    }

    const amount = request.amount || 0;
    const staffName = request.staffName || 'Staff';
    const staffCode = request.staffCode || '';
    const upiId = request.upiId || '';
    const upiUrl = upiId ? createUPIPaymentURL(upiId, amount, staffName, `Payment for ${staffCode}`) : '';

    const lines = [
      `Hi ${staffName}${staffCode ? ` (Code: ${staffCode})` : ''}, regarding your payment request:`,
      `Amount: ₹${(amount && amount.toLocaleString) ? amount.toLocaleString() : amount}`,
      upiId ? `UPI: ${upiId}` : null,
      upiUrl ? `UPI Link: ${upiUrl}` : null,
    ].filter(Boolean);
    const msg = lines.join('\n');

    const url = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  } catch (err) {
    console.error('WhatsApp redirection failed:', err);
    showToast('Failed to open WhatsApp. Please try again.', 'error');
  }
}

// Payment request filtering functions
function filterPaymentRequestsByStatus(status) {
  paymentRequestFilters.status = status;
  applyPaymentRequestFilters();
}

function searchPaymentRequests() {
  const searchInput = document.getElementById('paymentRequestSearch');
  paymentRequestFilters.search = searchInput.value;
  applyPaymentRequestFilters();
}

function filterPaymentRequestsByDate() {
  const startDate = document.getElementById('paymentRequestStartDate').value;
  const endDate = document.getElementById('paymentRequestEndDate').value;
  
  paymentRequestFilters.startDate = startDate;
  paymentRequestFilters.endDate = endDate;
  applyPaymentRequestFilters();
}

function clearPaymentRequestFilters() {
  paymentRequestFilters = {
    status: 'all',
    search: '',
    startDate: null,
    endDate: null
  };
  
  document.getElementById('paymentRequestSearch').value = '';
  document.getElementById('paymentRequestStartDate').value = '';
  document.getElementById('paymentRequestEndDate').value = '';
  document.getElementById('paymentRequestStatusFilter').value = 'all';
  
  applyPaymentRequestFilters();
}

// Modal functions
function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

// QR Scanner functions
function openQRScannerModal(targetInputId = 'staffCodeInput') {
  const modal = document.getElementById('qrScannerModal');
  if (!modal) {
    showToast('QR scanner modal not found', 'error');
    return;
  }
  
  // Validate that the target input field exists
  const targetInput = document.getElementById(targetInputId);
  if (!targetInput) {
    console.error('Target input field not found:', targetInputId);
    showToast(`Target input field '${targetInputId}' not found`, 'error');
    return;
  }
  
  // Store the target input ID for the scanner
  modal.setAttribute('data-target-input', targetInputId);
  console.log('Opening QR scanner for target input:', targetInputId); // Debug log
  
  modal.classList.remove('hidden');
  // Initialize scanner after modal is shown
  setTimeout(() => {
    initQRScanner();
  }, 100);
}

function closeQRScannerModal() {
  const modal = document.getElementById('qrScannerModal');
  if (modal) {
    modal.classList.add('hidden');
    stopQRScanner();
  }
}

function initQRScanner() {
  const qrReaderElement = document.getElementById('qr-reader');
  if (!qrReaderElement) {
    showToast('QR scanner element not found', 'error');
    return;
  }
  
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear();
  }
  
  // Check if Html5QrcodeScanner is available
  if (typeof Html5QrcodeScanner === 'undefined') {
    console.error('Html5QrcodeScanner library not loaded');
    showToast('QR scanner library not loaded. Please refresh the page.', 'error');
    return;
  }
  
  try {
    console.log('Initializing QR scanner...'); // Debug log
    html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      false
    );
    
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    isScanning = true;
    console.log('QR scanner initialized successfully'); // Debug log
  } catch (error) {
    console.error('Error initializing QR scanner:', error);
    showToast('Error initializing QR scanner: ' + error.message, 'error');
  }
}

function onScanSuccess(decodedText, decodedResult) {
  try {
    // Get the target input ID from the modal
    const modal = document.getElementById('qrScannerModal');
    if (!modal) {
      showToast('QR scanner modal not found', 'error');
      return;
    }
    
    const targetInputId = modal.getAttribute('data-target-input') || 'staffCodeInput';
    console.log('Target input ID:', targetInputId); // Debug log
    
    const targetInput = document.getElementById(targetInputId);
    
    if (!targetInput) {
      console.error('Target input not found for ID:', targetInputId); // Debug log
      showToast(`Target input field '${targetInputId}' not found`, 'error');
      closeQRScannerModal();
      return;
    }
    
    // First try to parse as JSON for structured QR codes
    try {
      const data = JSON.parse(decodedText);
      if (data.type === 'staff_payment_request') {
        handleStaffPaymentQR(data);
      } else if (data.type === 'staff_code' || data.staffCode) {
        // Handle staff code QR
        const staffCode = data.staffCode || data.code;
        targetInput.value = staffCode;
        showToast('Staff code scanned successfully', 'success');
      } else {
        showToast('Unknown QR code type', 'error');
      }
    } catch (jsonError) {
      // If not JSON, treat as plain text (could be a staff code)
      const scannedText = decodedText.trim();
      console.log('Scanned text (non-JSON):', scannedText); // Debug log
      
      // Check if it looks like a staff code (e.g., ALHQR001, ALHQR002, etc.)
      if (scannedText.match(/^ALH(QR)?\d+$/i)) {
        targetInput.value = scannedText.toUpperCase();
        showToast('Staff code scanned successfully', 'success');
      } else {
        // Try to use it as staff code anyway
        targetInput.value = scannedText;
        showToast('QR code scanned: ' + scannedText, 'success');
      }
    }
  } catch (error) {
    console.error('Error in onScanSuccess:', error); // Debug log
    showToast('Error processing scanned QR code: ' + error.message, 'error');
  } finally {
    closeQRScannerModal();
  }
}

function onScanFailure(error) {
  // Handle scan failure silently
}

function stopQRScanner() {
  if (html5QrcodeScanner && isScanning) {
    html5QrcodeScanner.clear();
    html5QrcodeScanner = null;
    isScanning = false;
  }
}

function handleStaffPaymentQR(data) {
  const { staffCode, amount, upiId } = data;
  
  // Find staff member
  const staffMember = staff.find(s => s.id === staffCode);
  if (!staffMember) {
    showToast('Staff member not found', 'error');
    return;
  }
  
  // Check if staff has sufficient balance
  if ((staffMember.wagebalance || 0) < amount) {
    showToast('Insufficient balance in staff account', 'error');
    return;
  }
  
  // Create payment request with sequential number
  const counterRef = doc(db, 'counters', 'paymentRequests');
  
  // Run transaction to safely increment counter
  runTransaction(db, async (transaction) => {
    // Get current counter value
    const counterDoc = await transaction.get(counterRef);
    const currentNumber = counterDoc.exists() ? counterDoc.data().number : 0;
    const newNumber = currentNumber + 1;
    
    // Set new counter value
    transaction.set(counterRef, { number: newNumber }, { merge: true });
    
    // Create payment request with the new number
    return addDoc(collection(db, 'paymentRequests'), {
      number: newNumber,
      staffCode: staffCode,
      staffName: staffMember.name,
      amount: amount,
      upiId: upiId,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }).then(() => {
    showToast('Payment request created successfully', 'success');
  }).catch((error) => {
    console.error('Error creating payment request:', error);
    showToast('Error creating payment request: ' + error.message, 'error');
  });
}

// Staff registration functions
function showStaffRegistrationForm() {
  const form = document.getElementById('staffRegistrationForm');
  const btn = document.getElementById('addStaffBtn');
  
  if (form.classList.contains('hidden')) {
    form.classList.remove('hidden');
    btn.innerHTML = '<i class="fas fa-times mr-2"></i>Cancel';
    btn.onclick = hideStaffRegistrationForm;
  }
}

function hideStaffRegistrationForm() {
  const form = document.getElementById('staffRegistrationForm');
  const btn = document.getElementById('addStaffBtn');
  
  form.classList.add('hidden');
  btn.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Register Staff';
  btn.onclick = showStaffRegistrationForm;
  
  // Clear form
  document.getElementById('registerStaffForm').reset();
  document.getElementById('newStaffBalance').value = '0';
}

async function registerNewStaff(formData) {
  try {
    const staffCode = formData.staffCode.toUpperCase();
    const mobile = formData.mobile.replace(/\D/g, ''); // Remove non-digits
    
    // Validate staff code format
    if (!/^ALHQR\d+$/.test(staffCode)) {
      throw new Error('Staff code must be in format ALHQR001, ALHQR002, etc.');
    }
    
    // Validate mobile number
    if (mobile.length !== 10) {
      throw new Error('Mobile number must be exactly 10 digits');
    }
    
    const normalizedMobile = '+91' + mobile;
    
    // Check if staff code already exists
    const existingStaffRef = doc(db, 'staff', staffCode);
    const existingStaffSnap = await getDoc(existingStaffRef);
    
    // Handle both Firebase and demo mode responses
    const staffExists = existingStaffSnap.exists ? existingStaffSnap.exists() : false;
    if (staffExists) {
      throw new Error('Staff code already exists. Please use a different code.');
    }
    
    // Create new staff document
    const staffData = {
      staffCode: staffCode,
      name: formData.name.trim(),
      mobile: normalizedMobile,
      email: formData.email ? formData.email.trim() : '',
      category: formData.category ? formData.category.trim() : '',
      department: formData.category ? formData.category.trim() : '', // Keep for backward compatibility
      wagebalance: parseFloat(formData.balance) || 0,
      wageBalance: parseFloat(formData.balance) || 0, // Keep both for compatibility
      worksInitiated: 0, // Initialize works initiated count
      jobsInitiated: 0, // Keep for backward compatibility
      registered: false, // Staff needs to set password first
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: currentUser?.email || 'admin'
    };
    
    await setDoc(existingStaffRef, staffData);
    
    showToast('Staff registered successfully! They can now scan their QR code to set up their password.', 'success');
    hideStaffRegistrationForm();
    loadStaff(); // Refresh staff list
    
  } catch (error) {
    console.error('Error registering staff:', error);
    throw error;
  }
}

// Staff Information Management Functions
async function loadStaffInfo() {
  const staffCodeInput = document.getElementById('staffCodeInput');
  const staffCode = staffCodeInput.value.trim().toUpperCase();
  
  if (!staffCode) {
    showToast('Please enter a staff code', 'error');
    return;
  }
  
  if (!staffCode.match(/^ALHQR\d+$/i)) {
    showToast('Invalid staff code format. Use ALHQR001, ALHQR002, etc.', 'error');
    return;
  }
  
  try {
    // Find staff member in local array first
    let staffMember = staff.find(s => s.id === staffCode);
    
    // If not found locally, try to fetch from Firebase
    if (!staffMember) {
      const staffDoc = await getDoc(doc(db, 'staff', staffCode));
      if (staffDoc.exists && staffDoc.exists()) {
        staffMember = { id: staffDoc.id, ...staffDoc.data() };
      }
    }
    
    if (!staffMember) {
      showToast('Staff member not found with code: ' + staffCode, 'error');
      hideStaffInfo();
      return;
    }
    
    // Display staff information
    displayStaffInfo(staffMember);
    
  } catch (error) {
    console.error('Error loading staff info:', error);
    showToast('Error loading staff information: ' + error.message, 'error');
    hideStaffInfo();
  }
}

function displayStaffInfo(staffMember) {
  const staffInfoDisplay = document.getElementById('staffInfoDisplay');
  const transactionBtn = document.getElementById('transactionBtn');
  
  // Update display elements
  document.getElementById('staffDisplayName').textContent = staffMember.name || 'N/A';
  document.getElementById('staffDisplayCategory').textContent = staffMember.category || staffMember.department || 'N/A';
  document.getElementById('staffDisplayBalance').textContent = `₹${(staffMember.wagebalance || 0).toLocaleString()}`;
  document.getElementById('worksInitiatedCount').textContent = staffMember.worksInitiated || staffMember.jobsInitiated || 0;
  
  // Set category input value for editing
  const categoryInput = document.getElementById('categoryInput');
  if (categoryInput) {
    categoryInput.value = staffMember.category || staffMember.department || '';
  }
  
  // Show staff info display
  staffInfoDisplay.classList.remove('hidden');
  
  // Enable transaction button
  if (transactionBtn) {
    transactionBtn.disabled = false;
  }
  
  showToast('Staff information loaded successfully', 'success');
}

function hideStaffInfo() {
  const staffInfoDisplay = document.getElementById('staffInfoDisplay');
  const transactionBtn = document.getElementById('transactionBtn');
  
  staffInfoDisplay.classList.add('hidden');
  
  // Disable transaction button
  if (transactionBtn) {
    transactionBtn.disabled = true;
  }
  
  // Reset works edit form
  document.getElementById('worksDisplay').classList.remove('hidden');
  document.getElementById('worksEditForm').classList.add('hidden');
  
  // Reset category edit form
  document.getElementById('categoryDisplay').classList.remove('hidden');
  document.getElementById('categoryEditForm').classList.add('hidden');
}

async function saveWorksInitiated() {
  const staffCode = document.getElementById('staffCodeInput').value.trim().toUpperCase();
  const worksCount = parseInt(document.getElementById('worksInitiatedInput').value) || 0;
  
  if (!staffCode) {
    showToast('Please enter a staff code first', 'error');
    return;
  }
  
  if (worksCount < 0) {
    showToast('Works initiated count cannot be negative', 'error');
    return;
  }
  
  try {
    await updateDoc(doc(db, 'staff', staffCode), {
      worksInitiated: worksCount,
      jobsInitiated: worksCount, // Keep for backward compatibility
      updatedAt: serverTimestamp()
    });
    
    // Update display
    document.getElementById('worksInitiatedCount').textContent = worksCount;
    document.getElementById('worksDisplay').classList.remove('hidden');
    document.getElementById('worksEditForm').classList.add('hidden');
    
    showToast('Works initiated count updated successfully', 'success');
    
    // Update local staff array
    const staffIndex = staff.findIndex(s => s.id === staffCode);
    if (staffIndex !== -1) {
      staff[staffIndex].worksInitiated = worksCount;
      staff[staffIndex].jobsInitiated = worksCount; // Keep for backward compatibility
    }
    
  } catch (error) {
    console.error('Error updating works initiated:', error);
    showToast('Error updating works initiated: ' + error.message, 'error');
  }
}

// Category Management Functions
async function saveCategory() {
  const staffCode = document.getElementById('staffCodeInput').value.trim().toUpperCase();
  const newCategory = document.getElementById('categoryInput').value.trim();
  
  if (!staffCode) {
    showToast('Please enter a staff code first', 'error');
    return;
  }
  
  try {
    await updateDoc(doc(db, 'staff', staffCode), {
      category: newCategory,
      department: newCategory, // Keep for backward compatibility
      updatedAt: serverTimestamp()
    });
    
    // Update display
    document.getElementById('staffDisplayCategory').textContent = newCategory || 'N/A';
    document.getElementById('categoryDisplay').classList.remove('hidden');
    document.getElementById('categoryEditForm').classList.add('hidden');
    
    showToast('Category updated successfully', 'success');
    
    // Update local staff array
    const staffIndex = staff.findIndex(s => s.id === staffCode);
    if (staffIndex !== -1) {
      staff[staffIndex].category = newCategory;
      staff[staffIndex].department = newCategory; // Keep for backward compatibility
    }
    
  } catch (error) {
    console.error('Error updating category:', error);
    showToast('Error updating category: ' + error.message, 'error');
  }
}

// Transaction Type Management
function updateTransactionType() {
  const isMoneyType = document.getElementById('moneyTypeRadio').checked;
  const amountLabel = document.getElementById('amountLabel');
  const reasonLabel = document.getElementById('reasonLabel');
  const transactionBtn = document.getElementById('transactionBtn');
  const transactionIcon = document.getElementById('transactionIcon');
  const transactionBtnText = document.getElementById('transactionBtnText');
  const reasonInput = document.getElementById('transactionReasonInput');
  
  if (isMoneyType) {
    amountLabel.textContent = 'Amount (₹)';
    reasonLabel.textContent = 'Reason (Optional)';
    transactionBtn.className = 'bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 whitespace-nowrap';
    transactionIcon.className = 'fas fa-plus mr-2';
    transactionBtnText.textContent = 'Add Money';
    reasonInput.placeholder = 'e.g., Bonus, Overtime, etc.';
  } else {
    amountLabel.textContent = 'Tip Amount (₹)';
    reasonLabel.textContent = 'Tip Reason (Optional)';
    transactionBtn.className = 'bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 whitespace-nowrap';
    transactionIcon.className = 'fas fa-gift mr-2';
    transactionBtnText.textContent = 'Add Tip';
    reasonInput.placeholder = 'e.g., Excellent service, Extra effort, etc.';
  }
}

// Search functions with debouncing
const debouncedSearchOrders = debounce(searchOrders, 300);
const debouncedSearchPaymentRequests = debounce(searchPaymentRequests, 300);

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Firebase
  initializeFirebase();
  
  // Check QR scanner library availability
  if (!checkQRScannerLibrary()) {
    console.warn('QR scanner library not available - some features may not work');
  }
  
  // For testing purposes, bypass authentication
  // In production, you should implement proper authentication
  currentUser = {
    email: 'team.alh.in@gmail.com',
    displayName: 'Admin User',
    uid: 'admin-test-uid'
  };
  
  // Load initial section based on hash or default to dashboard
  const hash = window.location.hash.substring(1);
  const section = hash || 'dashboard';
  showSection(section);
  
  // Uncomment below for production with proper authentication
  /*
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      // Load initial section based on hash or default to dashboard
      const hash = window.location.hash.substring(1);
      const section = hash || 'dashboard';
      showSection(section);
    } else {
      window.location.href = 'admin.html';
    }
  });
  */
  
  // Navigation event listeners
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      showSection(section);
    });
  });
  
  // Order search input
  const orderSearchInput = document.getElementById('orderSearch');
  if (orderSearchInput) {
    orderSearchInput.addEventListener('input', debouncedSearchOrders);
  }
  
  // Order filter dropdowns
  const orderStatusFilter = document.getElementById('orderStatusFilter');
  if (orderStatusFilter) {
    orderStatusFilter.addEventListener('change', (e) => {
      filterOrdersByStatus(e.target.value);
    });
  }
  
  // Date filters
  const orderStartDate = document.getElementById('orderStartDate');
  const orderEndDate = document.getElementById('orderEndDate');
  if (orderStartDate) {
    orderStartDate.addEventListener('change', filterOrdersByDate);
  }
  if (orderEndDate) {
    orderEndDate.addEventListener('change', filterOrdersByDate);
  }
  
  // Pagination buttons
  const prevPageBtn = document.getElementById('ordersPrevPage');
  const nextPageBtn = document.getElementById('ordersNextPage');
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', previousOrderPage);
  }
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', nextOrderPage);
  }
  
  // Clear filters button
  const clearFiltersBtn = document.getElementById('clearOrderFilters');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearOrderFilters);
  }
  
  // Payment request filter event listeners
  const paymentRequestSearchInput = document.getElementById('paymentRequestSearch');
  if (paymentRequestSearchInput) {
    paymentRequestSearchInput.addEventListener('input', debouncedSearchPaymentRequests);
  }
  
  const paymentRequestStatusFilter = document.getElementById('paymentRequestStatusFilter');
  if (paymentRequestStatusFilter) {
    paymentRequestStatusFilter.addEventListener('change', (e) => {
      filterPaymentRequestsByStatus(e.target.value);
    });
  }
  
  const paymentRequestStartDate = document.getElementById('paymentRequestStartDate');
  const paymentRequestEndDate = document.getElementById('paymentRequestEndDate');
  if (paymentRequestStartDate) {
    paymentRequestStartDate.addEventListener('change', filterPaymentRequestsByDate);
  }
  if (paymentRequestEndDate) {
    paymentRequestEndDate.addEventListener('change', filterPaymentRequestsByDate);
  }
  
  const clearPaymentRequestFiltersBtn = document.getElementById('clearPaymentRequestFilters');
  if (clearPaymentRequestFiltersBtn) {
    clearPaymentRequestFiltersBtn.addEventListener('click', clearPaymentRequestFilters);
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
  
  // Staff registration buttons
  const addStaffBtn = document.getElementById('addStaffBtn');
  if (addStaffBtn) {
    addStaffBtn.addEventListener('click', showStaffRegistrationForm);
  }
  
  const cancelStaffRegistrationBtn = document.getElementById('cancelStaffRegistration');
  if (cancelStaffRegistrationBtn) {
    cancelStaffRegistrationBtn.addEventListener('click', hideStaffRegistrationForm);
  }
  
  // Staff registration form
  const registerStaffForm = document.getElementById('registerStaffForm');
  if (registerStaffForm) {
    registerStaffForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        staffCode: document.getElementById('newStaffCode').value,
        name: document.getElementById('newStaffName').value,
        mobile: document.getElementById('newStaffMobile').value,
        email: document.getElementById('newStaffEmail').value,
        category: document.getElementById('newStaffCategory').value,
        balance: document.getElementById('newStaffBalance').value
      };
      
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      
      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Registering...';
        
        await registerNewStaff(formData);
        
      } catch (error) {
        showToast('Error registering staff: ' + error.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
  
  // Load Staff Info Button
  const loadStaffInfoBtn = document.getElementById('loadStaffInfoBtn');
  if (loadStaffInfoBtn) {
    loadStaffInfoBtn.addEventListener('click', loadStaffInfo);
  }

  // Staff Code Input - Auto load info on blur
  const staffCodeInput = document.getElementById('staffCodeInput');
  if (staffCodeInput) {
    staffCodeInput.addEventListener('blur', () => {
      const staffCode = staffCodeInput.value.trim();
      if (staffCode && staffCode.match(/^ALHQR\d+$/i)) {
        loadStaffInfo();
      }
    });
  }

  // Works Initiated Management (Legacy Jobs support for backward compatibility)
  const editJobsBtn = document.getElementById('editJobsBtn') || document.getElementById('editWorksBtn');
  const saveJobsBtn = document.getElementById('saveJobsBtn') || document.getElementById('saveWorksBtn');
  const cancelJobsBtn = document.getElementById('cancelJobsBtn') || document.getElementById('cancelWorksBtn');
  
  if (editJobsBtn) {
    editJobsBtn.addEventListener('click', () => {
      const jobsDisplay = document.getElementById('jobsDisplay') || document.getElementById('worksDisplay');
      const jobsEditForm = document.getElementById('jobsEditForm') || document.getElementById('worksEditForm');
      const jobsCountElement = document.getElementById('jobsInitiatedCount') || document.getElementById('worksInitiatedCount');
      const jobsInputElement = document.getElementById('jobsInitiatedInput') || document.getElementById('worksInitiatedInput');
      
      if (jobsDisplay) jobsDisplay.classList.add('hidden');
      if (jobsEditForm) jobsEditForm.classList.remove('hidden');
      
      const currentJobs = parseInt(jobsCountElement?.textContent) || 0;
      if (jobsInputElement) jobsInputElement.value = currentJobs;
    });
  }
  
  if (saveJobsBtn) {
    saveJobsBtn.addEventListener('click', saveWorksInitiated);
  }
  
  if (cancelJobsBtn) {
    cancelJobsBtn.addEventListener('click', () => {
      const jobsDisplay = document.getElementById('jobsDisplay') || document.getElementById('worksDisplay');
      const jobsEditForm = document.getElementById('jobsEditForm') || document.getElementById('worksEditForm');
      
      if (jobsDisplay) jobsDisplay.classList.remove('hidden');
      if (jobsEditForm) jobsEditForm.classList.add('hidden');
    });
  }

  // Category Management Event Listeners
  const editCategoryBtn = document.getElementById('editCategoryBtn');
  const saveCategoryBtn = document.getElementById('saveCategoryBtn');
  const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
  
  if (editCategoryBtn) {
    editCategoryBtn.addEventListener('click', () => {
      document.getElementById('categoryDisplay').classList.add('hidden');
      document.getElementById('categoryEditForm').classList.remove('hidden');
    });
  }
  
  if (saveCategoryBtn) {
    saveCategoryBtn.addEventListener('click', saveCategory);
  }
  
  if (cancelCategoryBtn) {
    cancelCategoryBtn.addEventListener('click', () => {
      document.getElementById('categoryDisplay').classList.remove('hidden');
      document.getElementById('categoryEditForm').classList.add('hidden');
    });
  }

  // Transaction Type Radio Buttons
  const moneyTypeRadio = document.getElementById('moneyTypeRadio');
  const tipTypeRadio = document.getElementById('tipTypeRadio');
  
  if (moneyTypeRadio) {
    moneyTypeRadio.addEventListener('change', updateTransactionType);
  }
  
  if (tipTypeRadio) {
    tipTypeRadio.addEventListener('change', updateTransactionType);
  }

  // Transaction Form (unified for both money and tips)
  const transactionForm = document.getElementById('transactionForm');
  if (transactionForm) {
    transactionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const staffCode = document.getElementById('staffCodeInput').value.trim().toUpperCase();
      const amount = parseFloat(document.getElementById('transactionAmountInput').value);
      const reason = document.getElementById('transactionReasonInput').value.trim();
      const isMoneyType = document.getElementById('moneyTypeRadio').checked;
      
      if (!staffCode) {
        showToast('Please enter a staff code and load staff information first', 'error');
        return;
      }
      
      if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
      }
      
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      
      try {
        submitBtn.disabled = true;
        const loadingText = isMoneyType ?
          '<i class="fas fa-spinner fa-spin mr-2"></i>Adding Money...' :
          '<i class="fas fa-spinner fa-spin mr-2"></i>Adding Tip...';
        submitBtn.innerHTML = loadingText;
        
        // Find staff member
        let staffMember = staff.find(s => s.id === staffCode);
        
        // If not found locally, try to fetch from Firebase
        if (!staffMember) {
          const staffDoc = await getDoc(doc(db, 'staff', staffCode));
          if (staffDoc.exists && staffDoc.exists()) {
            staffMember = { id: staffDoc.id, ...staffDoc.data() };
          }
        }
        
        if (!staffMember) {
          throw new Error('Staff member not found with code: ' + staffCode);
        }
        
        const newBalance = (staffMember.wagebalance || 0) + amount;
        
        // Prepare update data
        const updateData = {
          wageBalance: newBalance,
          wagebalance: newBalance, // Keep for backward compatibility
          updatedAt: serverTimestamp()
        };
        
        // If it's a tip, also update the bonus field
        if (!isMoneyType) {
          const currentBonus = staffMember.bonus || 0;
          const newBonus = currentBonus + amount;
          updateData.bonus = newBonus;
        }
        
        await updateDoc(doc(db, 'staff', staffCode), updateData);
        
        // Create appropriate record
        if (isMoneyType) {
          // Create payment record
          await addDoc(collection(db, 'staffPayments'), {
            staffCode: staffCode,
            staffName: staffMember.name,
            amount: amount,
            reason: reason || 'Money added by admin',
            type: 'credit',
            addedBy: 'admin',
            createdAt: serverTimestamp()
          });
          
          showToast(`₹${amount} added to ${staffMember.name}'s account successfully`, 'success');
        } else {
          // Create tip record
          await addDoc(collection(db, 'tips'), {
            staffCode: staffCode,
            staffName: staffMember.name,
            staffCategory: staffMember.category || staffMember.department,
            amount: amount,
            reason: reason || 'No reason specified',
            timestamp: serverTimestamp(),
            addedBy: 'admin'
          });
          
          showToast(`Tip of ₹${amount} added to ${staffMember.name}`, 'success');
        }
        
        // Update display
        document.getElementById('staffDisplayBalance').textContent = `₹${newBalance.toLocaleString()}`;
        
        // Update local staff array
        const staffIndex = staff.findIndex(s => s.id === staffCode);
        if (staffIndex !== -1) {
          staff[staffIndex].wageBalance = newBalance;
          staff[staffIndex].wagebalance = newBalance; // Keep for backward compatibility
          
          // If it's a tip, also update the bonus in local array
          if (!isMoneyType) {
            const currentBonus = staff[staffIndex].bonus || 0;
            staff[staffIndex].bonus = currentBonus + amount;
          }
        }
        
        // Update total balance section
        updateTotalBalanceSection(staff);
        
        // Clear form
        document.getElementById('transactionAmountInput').value = '';
        document.getElementById('transactionReasonInput').value = '';
        
      } catch (error) {
        console.error('Error processing transaction:', error);
        const errorType = isMoneyType ? 'adding money' : 'adding tip';
        showToast(`Error ${errorType}: ` + error.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  // Works Initiated Management (updated from Jobs)
  const editWorksBtn = document.getElementById('editWorksBtn');
  const saveWorksBtn = document.getElementById('saveWorksBtn');
  const cancelWorksBtn = document.getElementById('cancelWorksBtn');
  
  if (editWorksBtn) {
    editWorksBtn.addEventListener('click', () => {
      document.getElementById('worksDisplay').classList.add('hidden');
      document.getElementById('worksEditForm').classList.remove('hidden');
      const currentWorks = parseInt(document.getElementById('worksInitiatedCount').textContent) || 0;
      document.getElementById('worksInitiatedInput').value = currentWorks;
    });
  }
  
  if (saveWorksBtn) {
    saveWorksBtn.addEventListener('click', saveWorksInitiated);
  }
  
  if (cancelWorksBtn) {
    cancelWorksBtn.addEventListener('click', () => {
      document.getElementById('worksDisplay').classList.remove('hidden');
      document.getElementById('worksEditForm').classList.add('hidden');
    });
  }

  // Initialize transaction type on page load
  updateTransactionType();
  
  // Refresh Payment Requests button
  const refreshPaymentRequestsBtn = document.getElementById('refreshPaymentRequestsBtn');
  if (refreshPaymentRequestsBtn) {
    refreshPaymentRequestsBtn.addEventListener('click', () => {
      loadPaymentRequests();
      showToast('Payment requests refreshed', 'success');
    });
  }
  
  // Refresh Staff button
  const refreshStaffBtn = document.getElementById('refreshStaffBtn');
  if (refreshStaffBtn) {
    refreshStaffBtn.addEventListener('click', () => {
      loadStaff();
      showToast('Staff list refreshed', 'success');
    });
  }
  
  // QR Scanner buttons
  const qrScanBtn = document.getElementById('startQRScan');
  const scanQRBtn = document.getElementById('scanQRBtn');
  if (qrScanBtn) {
    qrScanBtn.addEventListener('click', initQRScanner);
  }
  if (scanQRBtn) {
    scanQRBtn.addEventListener('click', () => {
      console.log('Scan QR button clicked for staff management'); // Debug log
      openQRScannerModal('staffCodeInput');
    });
  }
  
  // Add event listener for the new staff registration scanner button
  const scanQRNewStaffBtn = document.getElementById('scanQRNewStaffBtn');
  if (scanQRNewStaffBtn) {
    scanQRNewStaffBtn.addEventListener('click', () => {
      console.log('Scan QR button clicked for new staff registration'); // Debug log
      openQRScannerModal('newStaffCode');
    });
  }
  
  const stopQRBtn = document.getElementById('stopQRScan');
  if (stopQRBtn) {
    stopQRBtn.addEventListener('click', stopQRScanner);
  }
  
  const closeQRScannerBtn = document.getElementById('closeQRScanner');
  if (closeQRScannerBtn) {
    closeQRScannerBtn.addEventListener('click', closeQRScannerModal);
  }
  
  // Modal close on backdrop click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });
  
  // Mobile navigation toggle
  const toggleSidebarBtn = document.getElementById('toggleSidebar');
  const closeSidebarBtn = document.getElementById('closeSidebar');
  const sidebar = document.getElementById('sidebar');
  
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      sidebar.classList.remove('-translate-x-full');
    });
  }
  
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', () => {
      sidebar.classList.add('-translate-x-full');
    });
  }
  
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth < 1024) { // lg breakpoint
      if (!sidebar.contains(e.target) && !toggleSidebarBtn.contains(e.target)) {
        sidebar.classList.add('-translate-x-full');
      }
    }
  });
  
  // Handle browser back/forward
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1);
    const section = hash || 'dashboard';
    showSection(section);
  });
});

// Global functions for window object
window.showSection = showSection;
window.logout = logout;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.updateOrderStatusDropdown = updateOrderStatusDropdown;
window.viewOrder = viewOrder;
window.updateTracking = updateTracking;
window.markOrderPaid = markOrderPaid;
window.copyAddress = copyAddress;
window.deleteOrder = deleteOrder;
window.filterOrdersByStatus = filterOrdersByStatus;
window.searchOrders = searchOrders;
window.filterOrdersByDate = filterOrdersByDate;
window.clearOrderFilters = clearOrderFilters;
window.previousOrderPage = previousOrderPage;
window.nextOrderPage = nextOrderPage;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.quickAddMoney = quickAddMoney;
window.viewStaffPayments = viewStaffPayments;
window.approvePaymentRequest = approvePaymentRequest;
window.rejectPaymentRequest = rejectPaymentRequest;

// Debug functions for QR scanner
window.testQRScanner = function() {
  console.log('Testing QR scanner...');
  console.log('Html5QrcodeScanner available:', typeof Html5QrcodeScanner !== 'undefined');
  console.log('staffCodeInput element:', document.getElementById('staffCodeInput'));
  console.log('newStaffCode element:', document.getElementById('newStaffCode'));
  console.log('qrScannerModal element:', document.getElementById('qrScannerModal'));
  console.log('qr-reader element:', document.getElementById('qr-reader'));
  
  // Test opening the modal
  openQRScannerModal('staffCodeInput');
};

// Debug function for total balance section
window.testTotalBalance = function() {
  console.log('Testing total balance section...');
  console.log('Current staff data:', staff);
  updateTotalBalanceSection(staff);
};
window.closeModal = closeModal;
window.openQRScannerModal = openQRScannerModal;
window.closeQRScannerModal = closeQRScannerModal;
window.initQRScanner = initQRScanner;
window.stopQRScanner = stopQRScanner;
window.showStaffRegistrationForm = showStaffRegistrationForm;
window.hideStaffRegistrationForm = hideStaffRegistrationForm;
window.registerNewStaff = registerNewStaff;
window.filterPaymentRequestsByStatus = filterPaymentRequestsByStatus;
window.searchPaymentRequests = searchPaymentRequests;
window.filterPaymentRequestsByDate = filterPaymentRequestsByDate;
window.clearPaymentRequestFilters = clearPaymentRequestFilters;
window.payViaUPI = payViaUPI;
window.loadStaffInfo = loadStaffInfo;
window.displayStaffInfo = displayStaffInfo;
window.hideStaffInfo = hideStaffInfo;
window.saveJobsInitiated = saveWorksInitiated; // Legacy support
window.saveWorksInitiated = saveWorksInitiated;
window.saveCategory = saveCategory;
window.updateTransactionType = updateTransactionType;
window.updateTotalBalanceSection = updateTotalBalanceSection;