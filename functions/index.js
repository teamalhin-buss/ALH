/**
 * Import function triggers from their respective submodules:
 *
 * const { onCall } = require("firebase-functions/v2/https");
 * const { onDocumentWritten } = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest, onCall, HttpsError} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const {getFirestore} = require("firebase-admin/firestore");
const admin = require("firebase-admin");
admin.initializeApp();

// Initialize Firebase Admin SDK
const db = getFirestore();

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// Create a simple HTTP function
exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

// Create user document in Firestore (callable function)
exports.createUserDocument = onCall(async (request) => {
  const {uid, email, displayName} = request.data;
  logger.info("Creating user document for:", uid);

  try {
    await db.collection("users").doc(uid).set({
      name: displayName || email?.split("@")[0] || "User",
      email: email,
      role: "user",
      status: "active",
      emailVerified: true,
      createdAt: new Date(),
    });
    logger.info("User document created successfully for:", uid);
    return {success: true, message: "User document created successfully"};
  } catch (error) {
    logger.error("Error creating user document:", error);
  }
});

// Create a new Razorpay order
exports.createRazorpayOrder = onRequest((req, res) => {
  const Razorpay = require('razorpay');
  const cors = require('cors')({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'https://alh-luxury-perfumes.web.app', 'https://alh-luxury-perfumes.firebaseapp.com'],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
  const razorpay = new Razorpay({
    key_id: 'rzp_live_R65bR5Nw6iThVZ',
    key_secret: 'qGx08xih6hno19dKDPl1rOZC'
  });

  // Enable CORS
  return cors(req, res, async () => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Allow-Credentials', 'true');
      return res.status(204).send('');
    }

    try {
      const { amount, currency = 'INR', receipt, payment_capture = 1 } = req.body;

      // Validate required fields
      if (!amount || !receipt) {
        return res.status(400).json({
          error: 'Missing required fields: amount and receipt are required'
        });
      }

      const options = {
        amount: amount,
        currency,
        receipt,
        payment_capture: payment_capture === 1
      };

      // Create Razorpay order
      const order = await razorpay.orders.create(options);

      // Return the order details
      return res.status(200).json({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      });

    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      return res.status(500).json({
        error: error.message || 'Failed to create order'
      });
    }
  });
});

// Function to handle cart operations
exports.handleCartOperation = onRequest(async (request, response) => {
  try {
    const {userId, operation, item} = request.body;

    // Verify user authentication (in a real implementation,
    // you would check the Firebase Auth token)
    // For now, we'll just check if userId is provided

    if (!userId) {
      response.status(400).send("User ID is required");
      return;
    }

    const cartRef = db.collection("carts").doc(userId);

    if (operation === "add") {
      // Add item to cart
      const cartDoc = await cartRef.get();

      if (cartDoc.exists) {
        // Update existing cart
        const cartData = cartDoc.data();
        const items = cartData.items || [];
        // Check if item already exists in cart
        // If so, update quantity; otherwise, add new item
        const existingItemIndex = items.findIndex((cartItem) =>
          cartItem.id === item.id);


        if (existingItemIndex >= 0) {
          // Update quantity of existing item
          items[existingItemIndex].quantity += item.quantity;
        } else {
          // Add new item to cart
          items.push(item);
        }

        await cartRef.update({
          items: items,
          updatedAt: new Date(),
        });
      } else {
        // Create new cart
        await cartRef.set({
          items: [item],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      response.send("Item added to cart successfully");
    } else if (operation === "remove") {
      // Remove item from cart
      const cartDoc = await cartRef.get();

      if (cartDoc.exists) {
        const cartData = cartDoc.data();
        const items = cartData.items || [];

        // Filter out the item to remove
        const updatedItems = items.filter((cartItem) =>
          cartItem.id !== item.id);

        await cartRef.update({
          items: updatedItems,
          updatedAt: new Date(),
        });

        response.send("Item removed from cart successfully");
      } else {
        response.send("Cart not found");
      }
    } else if (operation === "clear") {
      // Clear cart
      await cartRef.update({
        items: [],
        updatedAt: new Date(),
      });

      response.send("Cart cleared successfully");
    } else {
      response.status(400).send("Invalid operation");
    }
  } catch (error) {
    logger.error("Error handling cart operation:", error);
    response.status(500).send("Error handling cart operation");
  }
});

// ================= Staff Payment System (QR + OTP + Single Session) =================

const STAFF_COLLECTION = "staff";
const STAFF_PAYMENTS_COLLECTION = "staffPayments";
const ACTIVE_TTL_MINUTES = 30;

/**
 * Utility: require authentication for callable functions
 */
function requireAuth(context) {
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "You must be authenticated.");
  }
  return context.auth;
}

/**
 * Utility: Extract phone number from auth token when available (Phone Auth)
 */
function getPhoneFromAuth(auth) {
  // Firebase ID token may include phone_number for phone-authenticated users
  return auth?.token?.phone_number || null;
}

/**
 * Acquire a single active session for a staff code.
 * - Registers staff document if not present (links staffCode -> current UID + phone)
 * - Enforces only one active session per staffCode (with TTL for stale sessions)
 * - Returns session info and current wage balance
 *
 * data: { staffCode: string }
 */
exports.acquireStaffSession = onCall(async (request) => {
  const auth = requireAuth(request);
  const { staffCode } = request.data || {};
  if (!staffCode || typeof staffCode !== "string") {
    throw new HttpsError("invalid-argument", "staffCode is required.");
  }

  const uid = auth.uid;
  const phone = getPhoneFromAuth(auth);
  const staffRef = db.collection(STAFF_COLLECTION).doc(staffCode.trim());

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(staffRef);
    const now = admin.firestore.Timestamp.now();

    if (!snap.exists) {
      // First-time registration for this staff code
      tx.set(staffRef, {
        uid,
        phone: phone || null,
        wageBalance: 0,
        activeSession: {
          uid,
          createdAt: now,
          lastSeen: now,
        },
        createdAt: now,
        updatedAt: now,
      });

      return {
        sessionAcquired: true,
        created: true,
        wageBalance: 0,
        phone: phone || null,
        message: "Staff registered and session acquired.",
      };
    }

    const data = snap.data() || {};
    const ownerUid = data.uid;
    if (ownerUid && ownerUid !== uid) {
      // Staff code already bound to another account
      throw new HttpsError(
        "permission-denied",
        "This staff code is assigned to another user."
      );
    }

    const active = data.activeSession || null;
    let isExpired = false;
    if (active?.lastSeen?.toDate) {
      const lastSeen = active.lastSeen.toDate();
      isExpired = (Date.now() - lastSeen.getTime()) > ACTIVE_TTL_MINUTES * 60 * 1000;
    }

    // Enforce single active session: if another user holds it and it's not stale, block
    if (active && active.uid && active.uid !== uid && !isExpired) {
      throw new HttpsError(
        "failed-precondition",
        "Another active session is already in progress for this staff code."
      );
    }

    // If doc doesn't have an owner yet, bind it to current user
    if (!ownerUid) {
      tx.update(staffRef, {
        uid,
        phone: data.phone || phone || null,
        updatedAt: now,
      });
    }

    // Refresh or acquire session
    tx.update(staffRef, {
      activeSession: {
        uid,
        createdAt: active?.createdAt || now,
        lastSeen: now,
      },
      updatedAt: now,
    });

    return {
      sessionAcquired: true,
      created: false,
      wageBalance: typeof data.wageBalance === "number" ? data.wageBalance : 0,
      phone: data.phone || phone || null,
      message: "Session acquired.",
    };
  });

  return result;
});

/**
 * Release the active session held by the current user for a staff code.
 * data: { staffCode: string }
 */
exports.releaseStaffSession = onCall(async (request) => {
  const auth = requireAuth(request);
  const { staffCode } = request.data || {};
  if (!staffCode || typeof staffCode !== "string") {
    throw new HttpsError("invalid-argument", "staffCode is required.");
  }

  const uid = auth.uid;
  const staffRef = db.collection(STAFF_COLLECTION).doc(staffCode.trim());

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(staffRef);
    if (!snap.exists) return; // nothing to do

    const data = snap.data() || {};
    if (data.uid !== uid) {
      // Only owner can release their session
      throw new HttpsError("permission-denied", "Not allowed.");
    }
    const active = data.activeSession || null;
    if (active?.uid === uid) {
      tx.update(staffRef, {
        activeSession: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  return { released: true };
});

/**
 * Validate a payment (redemption) request.
 * - Checks ownership, active session, and sufficient balance.
 * - Does NOT mutate state. Actual deduction happens in updateWageBalance.
 *
 * data: { staffCode: string, amount: number }
 */
exports.validatePayment = onCall(async (request) => {
  const auth = requireAuth(request);
  const { staffCode, amount } = request.data || {};

  if (!staffCode || typeof staffCode !== "string") {
    throw new HttpsError("invalid-argument", "staffCode is required.");
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0 || Math.floor(amt) !== amt) {
    throw new HttpsError("invalid-argument", "amount must be a positive integer.");
  }

  const staffRef = db.collection(STAFF_COLLECTION).doc(staffCode.trim());
  const snap = await staffRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Staff not found.");
  }
  const data = snap.data() || {};
  if (data.uid !== auth.uid) {
    throw new HttpsError("permission-denied", "Not allowed.");
  }
  const active = data.activeSession || null;
  if (!active || active.uid !== auth.uid) {
    throw new HttpsError(
      "failed-precondition",
      "You must hold the active session to proceed."
    );
  }
  const balance = typeof data.wageBalance === "number" ? data.wageBalance : 0;
  if (amt > balance) {
    return { approved: false, message: "Insufficient balance." };
  }

  return { approved: true, message: "Approved." };
});

/**
 * Update wage balance after redemption.
 * - Re-validates session and balance server-side
 * - Deducts amount and records a staffPayments document in a single transaction
 *
 * data: { staffCode: string, amount: number }
 */
exports.updateWageBalance = onCall(async (request) => {
  const auth = requireAuth(request);
  const { staffCode, amount } = request.data || {};

  if (!staffCode || typeof staffCode !== "string") {
    throw new HttpsError("invalid-argument", "staffCode is required.");
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0 || Math.floor(amt) !== amt) {
    throw new HttpsError("invalid-argument", "amount must be a positive integer.");
  }

  const uid = auth.uid;
  const staffRef = db.collection(STAFF_COLLECTION).doc(staffCode.trim());
  const paymentRef = db.collection(STAFF_PAYMENTS_COLLECTION).doc(); // auto-id

  const out = await db.runTransaction(async (tx) => {
    const snap = await tx.get(staffRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Staff not found.");
    }
    const data = snap.data() || {};
    if (data.uid !== uid) {
      throw new HttpsError("permission-denied", "Not allowed.");
    }

    const active = data.activeSession || null;
    if (!active || active.uid !== uid) {
      throw new HttpsError(
        "failed-precondition",
        "You must hold the active session to proceed."
      );
    }

    const balance = typeof data.wageBalance === "number" ? data.wageBalance : 0;
    if (amt > balance) {
      throw new HttpsError("failed-precondition", "Insufficient balance.");
    }

    const newBalance = balance - amt;
    const now = admin.firestore.Timestamp.now();

    // Deduct balance
    tx.update(staffRef, {
      wageBalance: newBalance,
      updatedAt: now,
      // heartbeat active session
      "activeSession.lastSeen": now,
    });

    // Record payment
    tx.set(paymentRef, {
      uid,
      staffCode: staffCode.trim(),
      amount: amt,
      status: "completed", // for now; extend to 'pending' workflow if needed
      createdAt: now,
    });

    return { newBalance };
  });

  return out;
});

// =============== Update Staff Profile (Callable) ===============
/**
 * Update staff profile details securely via Cloud Functions.
 * Only the owner (uid) of /staff/{staffCode} may update these allowed fields:
 * - name, branch, address, upiId, bankAccount, ifsc (all strings; trimmed; length-limited)
 *
 * data: { staffCode: string, profile: { name?, branch?, address?, upiId?, bankAccount?, ifsc? } }
 */
exports.updateStaffProfile = onCall(async (request) => {
  const auth = requireAuth(request);
  const { staffCode, profile } = request.data || {};

  if (!staffCode || typeof staffCode !== "string") {
    throw new HttpsError("invalid-argument", "staffCode is required.");
  }
  if (!profile || typeof profile !== "object") {
    throw new HttpsError("invalid-argument", "profile object is required.");
  }

  const allowedKeys = ["name", "branch", "address", "upiId", "bankAccount", "ifsc"];
  const cleaned = {};
  const maxLen = 200;

  for (const key of allowedKeys) {
    if (typeof profile[key] === "string") {
      let v = profile[key].trim();
      if (v.length > maxLen) v = v.slice(0, maxLen);
      cleaned[key] = v;
    }
  }

  if (Object.keys(cleaned).length === 0) {
    throw new HttpsError("invalid-argument", "No valid fields to update.");
  }

  const ref = db.collection(STAFF_COLLECTION).doc(staffCode.trim());

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Staff not found.");
    }
    const data = snap.data() || {};
    if (data.uid !== auth.uid) {
      throw new HttpsError("permission-denied", "Not allowed.");
    }
    const now = admin.firestore.Timestamp.now();
    tx.update(ref, {
      ...cleaned,
      updatedAt: now,
      "activeSession.lastSeen": now,
    });
  });

  return { ok: true };
});
