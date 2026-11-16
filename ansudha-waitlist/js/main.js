/**
 * ==============================================================================
 * ANSUDHA — Heritage Waiting List
 * Main Frontend Controller (Vanilla JavaScript)
 * ==============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Detect current page
  const waitlistForm = document.getElementById('waitlist-form');
  const successPageContainer = document.getElementById('success-page');

  if (waitlistForm) {
    initWaitlistLandingPage();
  }

  if (successPageContainer) {
    initSuccessPage();
  }
});

/**
 * ==============================================================================
 * 1. LANDING PAGE FORM & OTP CONTROLLER
 * ==============================================================================
 */
function initWaitlistLandingPage() {
  // Step Containers
  const stepRegistration = document.getElementById('step-registration');
  const stepOtp = document.getElementById('step-otp');

  // Step 1: Form Elements
  const registrationForm = document.getElementById('waitlist-form');
  const nameInput = document.getElementById('full-name');
  const emailInput = document.getElementById('email-address');
  const submitBtn = document.getElementById('submit-btn');
  const formStatus = document.getElementById('form-status');

  // Step 1: Input Error Message Elements
  const nameError = document.getElementById('name-error');
  const emailError = document.getElementById('email-error');

  // Step 2: OTP Elements
  const otpForm = document.getElementById('otp-form');
  const otpBoxes = [
    document.getElementById('otp-1'),
    document.getElementById('otp-2'),
    document.getElementById('otp-3'),
    document.getElementById('otp-4')
  ];
  const otpTargetDisplay = document.getElementById('otp-target-display');
  const otpStatus = document.getElementById('otp-status');
  const verifyOtpBtn = document.getElementById('verify-otp-btn');
  const resendOtpBtn = document.getElementById('resend-otp-btn');
  const resendTimerSpan = document.getElementById('resend-timer');
  const otpBackBtn = document.getElementById('otp-back-btn');

  // State
  let pendingSubmission = null;
  let resendInterval = null;

  // Completely resets forms, state, and buttons back to clean Step 1
  function resetToFreshRegistration() {
    if (resendInterval) {
      clearInterval(resendInterval);
      resendInterval = null;
    }

    // 1. Reset inputs
    if (registrationForm) registrationForm.reset();
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';

    // 2. Clear field error states
    clearFieldError(nameInput, nameError);
    clearFieldError(emailInput, emailError);
    hideFormStatus(formStatus);
    hideFormStatus(otpStatus);

    // 3. Reset buttons
    setButtonLoading(submitBtn, false, 'JOIN THE WAITING LIST');
    if (submitBtn) submitBtn.disabled = false;
    setButtonLoading(verifyOtpBtn, false, 'VERIFY & CONFIRM');
    if (verifyOtpBtn) verifyOtpBtn.disabled = false;

    // 4. Reset OTP boxes & timer
    resetOtpInputs();
    if (resendOtpBtn) {
      resendOtpBtn.disabled = true;
      resendOtpBtn.innerHTML = 'Resend in <span id="resend-timer">30</span>s';
    }

    // 5. Restore Step 1 view & hide OTP Step 2
    if (stepRegistration) stepRegistration.style.display = 'block';
    if (stepOtp) stepOtp.style.display = 'none';

    // 6. Reset state
    pendingSubmission = null;
  }

  // Reset to fresh state on initial page load
  resetToFreshRegistration();

  // Reset when user returns via Browser Back Button or BFCache
  window.addEventListener('pageshow', () => {
    resetToFreshRegistration();
  });

  // Clear errors when the user types
  nameInput.addEventListener('input', () => clearFieldError(nameInput, nameError));
  emailInput.addEventListener('input', () => clearFieldError(emailInput, emailError));

  // ==========================================
  // STEP 1: FORM SUBMISSION -> REQUEST OTP
  // ==========================================
  registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFormStatus(formStatus);

    const nameVal = nameInput.value.trim();
    const emailVal = emailInput.value.trim();

    // 1. Validate Full Name
    const isNameValid = validateName(nameInput, nameError);

    // 2. Validate Email Address (Required)
    const isEmailValid = validateEmailFormat(emailInput, emailError);

    if (!isNameValid || !isEmailValid) {
      if (!isNameValid) nameInput.focus();
      else if (!isEmailValid) emailInput.focus();
      return;
    }

    // 3. Set Loading State
    setButtonLoading(submitBtn, true, 'SENDING CODE...');

    const formData = {
      fullName: nameVal,
      email: emailVal.toLowerCase()
    };

    try {
      // Request 4-digit OTP from backend
      const result = await window.AnsudhaSupabase.requestOtp(formData);

      if (result.success) {
        // Save pending data
        pendingSubmission = {
          formData,
          target: result.target,
          channel: result.channel
        };

        setButtonLoading(submitBtn, false);

        // Transition from Step 1 to Step 2 (OTP Verification)
        stepRegistration.style.display = 'none';
        stepOtp.style.display = 'block';

        // Update target display (e.g. su***@gmail.com)
        if (otpTargetDisplay) {
          otpTargetDisplay.textContent = result.maskedTarget || formData.email;
        }

        // Reset and focus OTP boxes
        resetOtpInputs();
        if (otpBoxes[0]) otpBoxes[0].focus();

        // Start Resend Timer
        startResendTimer();
      } else if (result.isDuplicate) {
        setButtonLoading(submitBtn, false);
        showFormStatus(
          formStatus,
          "You're already on our waiting list! We will notify you as soon as ANSUDHA goes live.",
          'info'
        );
      } else {
        setButtonLoading(submitBtn, false);
        showFormStatus(
          formStatus,
          result.error || "Unable to send verification code. Please check your connection and try again.",
          'error'
        );
      }
    } catch (err) {
      console.error('[ANSUDHA] Request OTP Error:', err);
      setButtonLoading(submitBtn, false);
      showFormStatus(
        formStatus,
        "An unexpected error occurred. Please try again in a moment.",
        'error'
      );
    }
  });

  // ==========================================
  // STEP 2: 4-DIGIT OTP INPUT INTERACTIONS
  // ==========================================
  otpBoxes.forEach((box, index) => {
    if (!box) return;

    // Handle character entry and auto-advance
    box.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val;

      if (val) {
        box.classList.add('filled');
        // Advance to next box
        if (index < otpBoxes.length - 1) {
          otpBoxes[index + 1].focus();
        } else {
          // If 4th digit entered, check if all 4 are filled
          const fullCode = getEnteredOtp();
          if (fullCode.length === 4) {
            triggerOtpVerification();
          }
        }
      } else {
        box.classList.remove('filled');
      }
    });

    // Handle Backspace navigation
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && index > 0) {
        otpBoxes[index - 1].focus();
      }
    });

    // Handle Paste (e.g. user copies 4-digit code from email/SMS)
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteText = (e.clipboardData || window.clipboardData).getData('text');
      const digits = pasteText.replace(/\D/g, '').substring(0, 4);

      if (digits) {
        for (let i = 0; i < digits.length && i < otpBoxes.length; i++) {
          otpBoxes[i].value = digits[i];
          otpBoxes[i].classList.add('filled');
        }
        const nextIndex = Math.min(digits.length, otpBoxes.length - 1);
        otpBoxes[nextIndex].focus();

        if (digits.length === 4) {
          triggerOtpVerification();
        }
      }
    });
  });

  // Get combined 4-digit OTP code string
  function getEnteredOtp() {
    return otpBoxes.map(b => (b ? b.value.trim() : '')).join('');
  }

  // Clear and reset OTP inputs
  function resetOtpInputs() {
    otpBoxes.forEach(b => {
      if (b) {
        b.value = '';
        b.classList.remove('filled');
      }
    });
    hideFormStatus(otpStatus);
  }

  // Trigger Verification
  async function triggerOtpVerification() {
    if (!pendingSubmission) return;

    const code = getEnteredOtp();
    if (code.length < 4) {
      showFormStatus(otpStatus, "Please enter all 4 digits of your verification code.", 'error');
      return;
    }

    setButtonLoading(verifyOtpBtn, true, 'VERIFYING...');
    hideFormStatus(otpStatus);

    try {
      const result = await window.AnsudhaSupabase.verifyOtp({
        contact: pendingSubmission.target,
        enteredOtp: code,
        subscriberData: pendingSubmission.formData
      });

      if (result.success) {
        // Save to sessionStorage for personalized success page
        try {
          sessionStorage.setItem('ansudha_subscriber', JSON.stringify({
            name: pendingSubmission.formData.fullName,
            email: pendingSubmission.formData.email
          }));
        } catch (_) {}

        // Navigate to success page
        const params = new URLSearchParams();
        params.set('name', pendingSubmission.formData.fullName);
        if (pendingSubmission.formData.email) params.set('email', pendingSubmission.formData.email);
        
        window.location.href = `success.html?${params.toString()}`;
      } else {
        setButtonLoading(verifyOtpBtn, false, 'VERIFY & CONFIRM');
        showFormStatus(
          otpStatus,
          result.error || "Invalid verification code. Please check your inbox/messages and try again.",
          'error'
        );
        resetOtpInputs();
        if (otpBoxes[0]) otpBoxes[0].focus();
      }
    } catch (err) {
      console.error('[ANSUDHA] Verification Error:', err);
      setButtonLoading(verifyOtpBtn, false, 'VERIFY & CONFIRM');
      showFormStatus(
        otpStatus,
        "Verification service error. Please try again.",
        'error'
      );
    }
  }

  // Handle OTP form submit button
  otpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    triggerOtpVerification();
  });

  // ==========================================
  // RESEND OTP TIMER & ACTION
  // ==========================================
  function startResendTimer() {
    let timeLeft = 30;
    if (resendOtpBtn) {
      resendOtpBtn.disabled = true;
      resendOtpBtn.innerHTML = `Resend in <span id="resend-timer">${timeLeft}</span>s`;
    }

    if (resendInterval) clearInterval(resendInterval);

    resendInterval = setInterval(() => {
      timeLeft--;
      const timerSpan = document.getElementById('resend-timer');
      if (timerSpan) timerSpan.textContent = timeLeft;

      if (timeLeft <= 0) {
        clearInterval(resendInterval);
        if (resendOtpBtn) {
          resendOtpBtn.disabled = false;
          resendOtpBtn.textContent = 'Resend Code';
        }
      }
    }, 1000);
  }

  if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', async () => {
      if (!pendingSubmission || resendOtpBtn.disabled) return;

      resendOtpBtn.disabled = true;
      resendOtpBtn.textContent = 'Resending...';
      hideFormStatus(otpStatus);

      try {
        const result = await window.AnsudhaSupabase.requestOtp(pendingSubmission.formData);
        if (result.success) {
          showFormStatus(
            otpStatus,
            `A new 4-digit code has been dispatched to ${result.maskedTarget || pendingSubmission.target}.`,
            'info'
          );
          resetOtpInputs();
          if (otpBoxes[0]) otpBoxes[0].focus();
          startResendTimer();
        } else {
          showFormStatus(otpStatus, result.error || "Unable to resend code. Please try again.", 'error');
          resendOtpBtn.disabled = false;
          resendOtpBtn.textContent = 'Resend Code';
        }
      } catch (err) {
        console.error('[ANSUDHA] Resend Error:', err);
        showFormStatus(otpStatus, "Failed to resend code. Please check your connection.", 'error');
        resendOtpBtn.disabled = false;
        resendOtpBtn.textContent = 'Resend Code';
      }
    });
  }

  // ==========================================
  // BACK BUTTON: RETURN TO STEP 1
  // ==========================================
  if (otpBackBtn) {
    otpBackBtn.addEventListener('click', () => {
      if (resendInterval) clearInterval(resendInterval);
      stepOtp.style.display = 'none';
      stepRegistration.style.display = 'block';
      hideFormStatus(formStatus);
      setButtonLoading(submitBtn, false);
      if (emailInput) {
        emailInput.focus();
      }
    });
  }
}

/**
 * Field Validation Helpers
 */
function validateName(input, errorEl) {
  const value = input.value.trim();
  if (!value) {
    showFieldError(input, errorEl, "Please enter your full name.");
    return false;
  }
  if (value.length < 2) {
    showFieldError(input, errorEl, "Name must be at least 2 characters.");
    return false;
  }
  clearFieldError(input, errorEl);
  return true;
}

function validateEmailFormat(input, errorEl) {
  const value = input.value.trim();
  // RFC 5322 standard compliant regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

  if (!emailRegex.test(value)) {
    showFieldError(input, errorEl, "Please enter a valid email address (e.g. name@domain.com).");
    return false;
  }
  clearFieldError(input, errorEl);
  return true;
}

function validatePhoneFormat(input, errorEl) {
  const value = input.value.replace(/[\s-]/g, '').trim();
  const phoneRegex = /^[0-9]{7,15}$/;

  if (!phoneRegex.test(value)) {
    showFieldError(input, errorEl, "Please enter a valid phone number (7 to 15 digits).");
    return false;
  }
  clearFieldError(input, errorEl);
  return true;
}

function showFieldError(input, errorEl, message) {
  input.classList.add('is-invalid');
  input.setAttribute('aria-invalid', 'true');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('visible');
  }
}

function clearFieldError(input, errorEl) {
  input.classList.remove('is-invalid');
  input.removeAttribute('aria-invalid');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.remove('visible');
  }
}

function showFormStatus(statusEl, message, type = 'error') {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `form-status visible ${type}`;
  statusEl.setAttribute('role', 'alert');
  statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideFormStatus(statusEl) {
  if (!statusEl) return;
  statusEl.className = 'form-status';
  statusEl.textContent = '';
}

function setButtonLoading(btn, isLoading, loadingText = 'PROCESSING...') {
  if (!btn) return;
  const btnText = btn.querySelector('.btn-text');

  if (isLoading) {
    btn.disabled = true;
    btn.classList.add('loading');
    if (btnText) btnText.textContent = loadingText;
  } else {
    btn.disabled = false;
    btn.classList.remove('loading');
    if (btnText) {
      if (btn.id === 'verify-otp-btn') {
        btnText.textContent = 'VERIFY & CONFIRM';
      } else {
        btnText.textContent = 'JOIN THE WAITING LIST';
      }
    }
  }
}

/**
 * ==============================================================================
 * 2. SUCCESS PAGE CONTROLLER (success.html)
 * ==============================================================================
 */
function initSuccessPage() {
  const userNameElement = document.getElementById('subscriber-name');
  const userEmailElement = document.getElementById('subscriber-email');
  const shareBtn = document.getElementById('share-btn');

  // Retrieve query params or sessionStorage
  const urlParams = new URLSearchParams(window.location.search);
  let name = urlParams.get('name');
  let email = urlParams.get('email');
  let phone = urlParams.get('phone');

  if (!name || (!email && !phone)) {
    try {
      const stored = sessionStorage.getItem('ansudha_subscriber');
      if (stored) {
        const parsed = JSON.parse(stored);
        name = name || parsed.name;
        email = email || parsed.email;
        phone = phone || parsed.phone;
      }
    } catch {
      // Ignore
    }
  }

  // Personalize message if name exists
  if (name && userNameElement) {
    userNameElement.textContent = name;
  }

  if (userEmailElement) {
    if (email && phone) {
      userEmailElement.textContent = `A confirmation has been reserved for ${email} & ${phone}.`;
    } else if (email) {
      userEmailElement.textContent = `A confirmation has been reserved for ${email}.`;
    } else if (phone) {
      userEmailElement.textContent = `A confirmation has been reserved for ${phone}.`;
    } else {
      userEmailElement.textContent = 'Your spot on the waiting list has been reserved.';
    }
  }

  // Share with friends button
  if (shareBtn) {
    shareBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const shareData = {
        title: 'ANSUDHA',
        text: "Join me on the waiting list for ANSUDHA — a meaningful new chapter celebrating Odisha's timeless craft heritage.",
        url: window.location.origin + window.location.pathname.replace('success.html', 'index.html')
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch {
          // User canceled share
        }
      } else {
        // Fallback: Copy link to clipboard
        try {
          await navigator.clipboard.writeText(shareData.url);
          const originalText = shareBtn.textContent;
          shareBtn.textContent = 'LINK COPIED TO CLIPBOARD';
          setTimeout(() => {
            shareBtn.textContent = originalText;
          }, 3000);
        } catch {
          // Clipboard fallback
        }
      }
    });
  }
}
