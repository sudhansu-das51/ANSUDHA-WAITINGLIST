/**
 * ==============================================================================
 * ANSUDHA — Heritage Waiting List
 * Supabase Backend Service (Vanilla JavaScript)
 * ==============================================================================
 * Handles database persistence, duplicate email prevention, and transactional
 * waitlist registration flows.
 *
 * NOTE FOR DEPLOYMENT:
 * Replace the configuration placeholders below with your actual Supabase credentials.
 * See supabase/README.md for detailed step-by-step instructions.
 */

/**
 * ==============================================================================
 * READ CONFIGURATION FROM SEPARATE ENV FILES (Keys & IDs)
 * ==============================================================================
 * Keys are loaded from: js/env.keys.js (.env.keys)
 * IDs are loaded from:  js/env.ids.js  (.env.ids)
 */
const envKeys = (typeof window !== 'undefined' && window.ANSUDHA_KEYS) || {};
const envIds = (typeof window !== 'undefined' && window.ANSUDHA_IDS) || {};

const SUPABASE_CONFIG = {
  // 1. Your Supabase Project URL (from env.ids)
  url: envIds.SUPABASE_PROJECT_URL || 'https://zgstuxkrkfmkpgztaidm.supabase.co',

  // 2. Your Supabase Public Anon Key (from env.keys)
  anonKey: envKeys.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnc3R1eGtya2Zta3BnenRhaWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3OTY2MzgsImV4cCI6MjExMDM3MjYzOH0.YSRCHMTXW4rVYQCYx69Nn6nM9e_KucBopXsXUWemQyQ',

  // 3. Database Table Name (from env.ids)
  tableName: envIds.SUPABASE_TABLE_NAME || 'waitlist_registrations',

  // 4. Supabase Edge Function URL for transactional email & SMS triggers
  get edgeFunctionUrl() {
    return `${(this.url || '').replace(/\/$/, '')}/functions/v1/send-waitlist-email`;
  }
};

/**
 * ==============================================================================
 * REAL SMS & REAL EMAIL DELIVERY CONFIGURATION
 * ==============================================================================
 * Automatically reads API keys from env.keys and IDs from env.ids
 */
const NOTIFICATION_CONFIG = {
  // 1. FAST2SMS (Real SMS to Indian Mobile Numbers) - From env.keys
  get fast2SmsApiKey() {
    return (typeof window !== 'undefined' && window.ANSUDHA_KEYS && window.ANSUDHA_KEYS.FAST2SMS_API_KEY) || '';
  },

  // 2. EMAILJS (Real Email Delivery to Gmail) - IDs from env.ids, Key from env.keys
  emailJs: {
    get serviceId() {
      return (typeof window !== 'undefined' && window.ANSUDHA_IDS && window.ANSUDHA_IDS.EMAILJS_SERVICE_ID) || '';
    },
    get templateId() {
      return (typeof window !== 'undefined' && window.ANSUDHA_IDS && window.ANSUDHA_IDS.EMAILJS_TEMPLATE_ID) || '';
    },
    get publicKey() {
      return (typeof window !== 'undefined' && window.ANSUDHA_KEYS && window.ANSUDHA_KEYS.EMAILJS_PUBLIC_KEY) || '';
    }
  }
};

/**
 * Send Real SMS via Fast2SMS (Delivers in 2-5 seconds across Indian telecom networks)
 */
async function sendRealSmsOtp({ phone, countryCode, otp }) {
  let cleanPhone = (phone || '').replace(/[\s-]/g, '').trim();
  if (cleanPhone.startsWith('+91')) cleanPhone = cleanPhone.substring(3);
  if (cleanPhone.startsWith('91') && cleanPhone.length === 12) cleanPhone = cleanPhone.substring(2);
  if (cleanPhone.startsWith('0') && cleanPhone.length === 11) cleanPhone = cleanPhone.substring(1);

  const apiKey = NOTIFICATION_CONFIG.fast2SmsApiKey;

  if (!apiKey || apiKey === 'YOUR_FAST2SMS_API_KEY_HERE') {
    console.warn('[ANSUDHA SMS] Fast2SMS API Key is not set in js/supabase.js. Please add your key to send real SMS.');
    return { success: false, reason: 'no_api_key' };
  }

  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: cleanPhone
      })
    });
    const data = await response.json();
    console.info('[ANSUDHA SMS] Fast2SMS Dispatch Status:', data);
    return { success: Boolean(data && data.return), data };
  } catch (err) {
    console.error('[ANSUDHA SMS] Fast2SMS Network Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send Real Email via EmailJS (Delivers directly to Gmail, Yahoo, Outlook, etc.)
 */
async function sendRealEmailOtp({ name, email, otp }) {
  const { serviceId, templateId, publicKey } = NOTIFICATION_CONFIG.emailJs;

  if (!serviceId || !templateId || !publicKey || serviceId === 'YOUR_EMAILJS_SERVICE_ID') {
    console.warn('[ANSUDHA EMAIL] EmailJS credentials are not set in js/supabase.js. Please add your keys to send real emails.');
    return { success: false, reason: 'no_credentials' };
  }

  try {
    const templateParams = {
      to_name: name || 'Subscriber',
      name: name || 'Subscriber',
      to_email: email,
      email: email,
      recipient: email,
      otp_code: otp,
      otp: otp,
      passcode: otp,
      code: otp,
      app_name: 'ANSUDHA',
      time: '15 minutes'
    };

    if (window.emailjs) {
      window.emailjs.init({ publicKey });
      const res = await window.emailjs.send(serviceId, templateId, templateParams);
      console.info('[ANSUDHA EMAIL] EmailJS Dispatch Status:', res);
      return { success: true, res };
    } else {
      // Fallback via EmailJS REST API
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: templateParams
        })
      });
      return { success: res.ok };
    }
  } catch (err) {
    console.error('[ANSUDHA EMAIL] EmailJS Network Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Checks whether real Supabase credentials have been configured
 */
function isSupabaseConfigured() {
  return (
    SUPABASE_CONFIG.url &&
    SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL_HERE' &&
    SUPABASE_CONFIG.anonKey &&
    SUPABASE_CONFIG.anonKey !== 'YOUR_ANON_PUBLIC_KEY_HERE'
  );
}

/**
 * Mask an email or phone number for privacy display
 * e.g., "sudhanshudas717@gmail.com" -> "su***@gmail.com"
 * e.g., "+918018414165" -> "+91 ******4165"
 */
function maskContact(contact, channel) {
  if (!contact) return '';
  if (channel === 'email' || contact.includes('@')) {
    const [user, domain] = contact.split('@');
    if (!domain) return contact;
    const visibleLen = Math.min(2, user.length);
    return `${user.substring(0, visibleLen)}***@${domain}`;
  } else {
    // Phone masking
    const clean = contact.replace(/[\s-]/g, '');
    if (clean.length > 6) {
      const prefix = clean.substring(0, clean.length - 8);
      const suffix = clean.substring(clean.length - 4);
      return `${prefix} ******${suffix}`;
    }
    return contact;
  }
}

/**
 * LocalStorage Mock Helper (used in Demo Mode so you can test the UI locally before configuring Supabase)
 */
const LocalWaitlistStore = {
  STORAGE_KEY: 'ansudha_waitlist_local_subscribers',
  OTP_KEY: 'ansudha_waitlist_local_otps',

  getAll() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  exists({ email, phone }) {
    const list = this.getAll();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').replace(/[\s-]/g, '').trim();

    return list.some(item => {
      const emailMatches = Boolean(cleanEmail && item.email && item.email.trim().toLowerCase() === cleanEmail);
      const phoneMatches = Boolean(cleanPhone && item.phone && item.phone.replace(/[\s-]/g, '').trim() === cleanPhone);
      return emailMatches || phoneMatches;
    });
  },

  add(record) {
    const list = this.getAll();
    list.push({
      ...record,
      id: 'local_' + Date.now(),
      created_at: new Date().toISOString()
    });
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Could not write to localStorage:', e);
    }
  },

  saveOtp(contact, otp) {
    try {
      const data = {
        contact,
        otp,
        expires_at: Date.now() + 10 * 60000,
        verified: false
      };
      sessionStorage.setItem(`${this.OTP_KEY}_${contact}`, JSON.stringify(data));
    } catch (_) {}
  },

  getOtp(contact) {
    try {
      const item = sessionStorage.getItem(`${this.OTP_KEY}_${contact}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }
};

/**
 * Request a 4-Digit Verification OTP for Email or SMS
 * @param {Object} data
 * @param {string} data.fullName
 * @param {string} [data.email]
 * @param {string} [data.countryCode]
 * @param {string} [data.phone]
 * @returns {Promise<{success: boolean, channel?: string, target?: string, maskedTarget?: string, devOtp?: string, isDuplicate?: boolean, error?: string}>}
 */
async function requestOtp({ fullName, email = '', countryCode = '+91', phone = '' }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const normalizedName = (fullName || '').trim();
  const normalizedPhone = (phone || '').replace(/[\s-]/g, '').trim();

  // Determine Destination Channels
  const hasEmail = Boolean(normalizedEmail);
  const hasPhone = Boolean(normalizedPhone);
  const hasBoth = hasEmail && hasPhone;

  const channel = hasBoth ? 'both' : (hasEmail ? 'email' : 'sms');
  const target = hasEmail ? normalizedEmail : `${countryCode}${normalizedPhone}`;
  
  // Format user-facing target string
  let maskedTarget = '';
  if (hasBoth) {
    maskedTarget = `${maskContact(normalizedEmail, 'email')} & ${maskContact(countryCode + normalizedPhone, 'sms')}`;
  } else if (hasEmail) {
    maskedTarget = maskContact(normalizedEmail, 'email');
  } else {
    maskedTarget = maskContact(countryCode + normalizedPhone, 'sms');
  }

  // Generate secure 4-digit code (1000 - 9999)
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

  // Print OTP log in browser console for monitoring
  console.log(
    `%c🔑 [ANSUDHA OTP CODE]: ${otpCode} %c(Dispatched to ${target} via ${channel.toUpperCase()})`,
    'background: #5D1317; color: #F5F2B3; font-size: 15px; font-weight: bold; padding: 4px 10px; border-radius: 4px; border: 1px solid #B66A0A;',
    'color: #5D1317; font-weight: bold;'
  );

  // Save in local session store for immediate verification matching
  if (hasEmail) LocalWaitlistStore.saveOtp(normalizedEmail, otpCode);
  if (hasPhone) LocalWaitlistStore.saveOtp(`${countryCode}${normalizedPhone}`, otpCode);
  LocalWaitlistStore.saveOtp(target, otpCode);

  // ==========================================
  // DISPATCH REAL SMS & REAL EMAIL
  // ==========================================
  // 1. Send Real SMS if mobile number entered
  if (hasPhone) {
    sendRealSmsOtp({ phone: normalizedPhone, countryCode, otp: otpCode });
  }

  // 2. Send Real Email if email address entered
  if (hasEmail) {
    sendRealEmailOtp({ name: normalizedName, email: normalizedEmail, otp: otpCode });
  }

  // Check demo mode if Supabase credentials are empty
  if (!isSupabaseConfigured()) {
    if (LocalWaitlistStore.exists({ email: normalizedEmail, phone: normalizedPhone })) {
      return {
        success: false,
        isDuplicate: true,
        error: "You are already on our waiting list! We will notify you when we go live."
      };
    }

    return {
      success: true,
      channel,
      target,
      maskedTarget,
      devOtp: otpCode
    };
  }

  // --- LIVE SUPABASE INTEGRATION ---
  try {
    // 1. First check if contact already exists in database
    let duplicateCheckUrl = `${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.tableName}?select=id&limit=1`;
    if (normalizedEmail) {
      duplicateCheckUrl += `&email=eq.${encodeURIComponent(normalizedEmail)}`;
    } else if (normalizedPhone) {
      duplicateCheckUrl += `&phone=eq.${encodeURIComponent(normalizedPhone)}&country_code=eq.${encodeURIComponent(countryCode)}`;
    }

    try {
      const checkRes = await fetch(duplicateCheckUrl, {
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
        }
      });
      if (checkRes.ok) {
        const rows = await checkRes.json();
        if (rows && rows.length > 0) {
          return {
            success: false,
            isDuplicate: true,
            error: "You are already on our waiting list! We will notify you when we go live."
          };
        }
      }
    } catch (_) {
      // Non-blocking duplicate pre-check
    }

    // 2. Local session store manages OTP verification seamlessly

    // 3. Dispatch OTP Notification via Edge Function (Only if Fast2SMS/EmailJS are not configured)
    const hasClientDispatch = Boolean(NOTIFICATION_CONFIG.fast2SmsApiKey || NOTIFICATION_CONFIG.emailJs.serviceId);
    if (!hasClientDispatch && SUPABASE_CONFIG.edgeFunctionUrl) {
      try {
        fetch(SUPABASE_CONFIG.edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_CONFIG.anonKey
          },
          body: JSON.stringify({
            type: 'otp_verification',
            fullName: normalizedName,
            email: normalizedEmail,
            countryCode,
            phone: normalizedPhone,
            otp: otpCode,
            channel
          })
        }).catch(() => {});
      } catch (_) {}
    }

    return {
      success: true,
      channel,
      target,
      maskedTarget,
      devOtp: otpCode
    };
  } catch (err) {
    console.error('[ANSUDHA] requestOtp network error:', err);
    // Even if Supabase network hiccups, fallback gracefully with session OTP so user is never blocked
    return {
      success: true,
      channel,
      target,
      maskedTarget,
      devOtp: otpCode
    };
  }
}

/**
 * Verify the 4-Digit OTP and Complete Registration
 * @param {Object} verifyData
 * @param {string} verifyData.contact
 * @param {string} verifyData.enteredOtp
 * @param {Object} verifyData.subscriberData
 * @returns {Promise<{success: boolean, error?: string, isDuplicate?: boolean}>}
 */
async function verifyOtp({ contact, enteredOtp, subscriberData }) {
  const cleanEnteredOtp = (enteredOtp || '').trim();

  if (cleanEnteredOtp.length !== 4) {
    return { success: false, error: "Please enter the complete 4-digit code." };
  }

  // 1. Check local session store fallback first
  let localOtpRecord = LocalWaitlistStore.getOtp(contact);
  if (!localOtpRecord && subscriberData) {
    if (subscriberData.email) localOtpRecord = LocalWaitlistStore.getOtp(subscriberData.email.toLowerCase());
    if (!localOtpRecord && subscriberData.phone) {
      localOtpRecord = LocalWaitlistStore.getOtp(`${subscriberData.countryCode || '+91'}${subscriberData.phone.replace(/[\s-]/g, '')}`);
    }
  }
  let isLocalMatched = false;

  if (localOtpRecord) {
    if (Date.now() > localOtpRecord.expires_at) {
      return { success: false, error: "Code has expired. Please click 'Resend' to get a new code." };
    }
    if (localOtpRecord.otp === cleanEnteredOtp) {
      isLocalMatched = true;
    }
  }

  // If local session store didn't match
  if (!isLocalMatched) {
    return {
      success: false,
      error: "Invalid 4-digit code. Please check your inbox and try again."
    };
  }

  // 3. OTP is valid! Proceed to register the subscriber permanently
  const regResult = await registerSubscriber(subscriberData);
  return regResult;
}

/**
 * Register a user on the ANSUDHA waiting list
 * @param {Object} subscriberData
 * @param {string} subscriberData.fullName
 * @param {string} [subscriberData.email]
 * @param {string} [subscriberData.countryCode]
 * @param {string} [subscriberData.phone]
 * @returns {Promise<{success: boolean, isDuplicate?: boolean, error?: string, mode?: string, data?: any}>}
 */
async function registerSubscriber({ fullName, email = '', countryCode = '+91', phone = '' }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const normalizedName = (fullName || '').trim();
  const normalizedPhone = (phone || '').replace(/[\s-]/g, '').trim();

  // If Supabase is not configured yet, run in graceful Demo Mode
  if (!isSupabaseConfigured()) {
    console.info(
      '%c[ANSUDHA] Demo Mode Active%c\nSupabase credentials are not configured yet in js/supabase.js.\nSaving registration to browser storage for local preview.',
      'color: #B66A0A; font-weight: bold;',
      'color: inherit;'
    );

    // Artificial delay to simulate real network roundtrip
    await new Promise(resolve => setTimeout(resolve, 600));

    // Check duplicate in local store
    if (LocalWaitlistStore.exists({ email: normalizedEmail, phone: normalizedPhone })) {
      return {
        success: false,
        isDuplicate: true,
        error: "You are already on the waiting list! We have recorded your interest."
      };
    }

    // Save to local store
    LocalWaitlistStore.add({
      full_name: normalizedName,
      email: normalizedEmail,
      country_code: normalizedPhone ? countryCode : '',
      phone: normalizedPhone
    });

    return {
      success: true,
      mode: 'demo',
      message: 'Demo registration successful. Add your Supabase credentials in js/supabase.js for live cloud storage.'
    };
  }

  // --- LIVE SUPABASE INTEGRATION VIA REST API ---
  const endpoint = `${SUPABASE_CONFIG.url.replace(/\/$/, '')}/rest/v1/${SUPABASE_CONFIG.tableName}`;

  try {
    const payload = {
      full_name: normalizedName,
      source: 'web_landing'
    };
    if (normalizedEmail) payload.email = normalizedEmail;
    if (normalizedPhone) {
      payload.phone = normalizedPhone;
      payload.country_code = countryCode;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    // Check for Duplicate Registration (PostgreSQL error 23505 / HTTP 409)
    if (response.status === 409) {
      return {
        success: false,
        isDuplicate: true,
        error: "You are already on our waiting list! We will notify you when we go live."
      };
    }

    // Success response from PostgREST with return=minimal is 201 Created (no body)
    if (response.status === 201 || response.ok) {
      // Optional: Trigger Edge Function email if configured
      if (SUPABASE_CONFIG.edgeFunctionUrl) {
        try {
          fetch(SUPABASE_CONFIG.edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_CONFIG.anonKey
            },
            body: JSON.stringify({
              type: 'registration_confirmation',
              email: normalizedEmail,
              fullName: normalizedName,
              countryCode,
              phone: normalizedPhone
            })
          }).catch(err => console.warn('Non-blocking email trigger error:', err));
        } catch (e) {
          // Non-blocking error
        }
      }

      return {
        success: true,
        mode: 'live'
      };
    }

    // Parse error response if not OK
    let errorData = {};
    try {
      errorData = await response.json();
    } catch (_) {}

    // Supabase duplicate error format check
    if (
      errorData.code === '23505' ||
      (errorData.message && errorData.message.toLowerCase().includes('unique constraint'))
    ) {
      return {
        success: false,
        isDuplicate: true,
        error: "You are already on our waiting list! We will notify you when we go live."
      };
    }

    return {
      success: false,
      error: errorData.message || `Registration failed with status ${response.status}.`
    };
  } catch (networkError) {
    console.warn('[ANSUDHA] Supabase Network Error (saving to local offline store):', networkError);
    // Graceful offline fallback: save to local store so testing is never blocked by DNS or connectivity
    try {
      LocalWaitlistStore.add({
        full_name: normalizedName,
        email: normalizedEmail,
        country_code: normalizedPhone ? countryCode : '',
        phone: normalizedPhone
      });
      return {
        success: true,
        mode: 'offline_fallback',
        message: 'Saved locally (offline fallback).'
      };
    } catch (_) {
      return {
        success: false,
        error: "Unable to reach the server. Please check your internet connection and try again."
      };
    }
  }
}

// Expose on global window object
window.AnsudhaSupabase = {
  config: SUPABASE_CONFIG,
  isConfigured: isSupabaseConfigured,
  register: registerSubscriber,
  requestOtp: requestOtp,
  verifyOtp: verifyOtp
};

