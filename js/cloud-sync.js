/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * MODULE 6: CLOUD SYNC & USER ACCOUNTS (FIREBASE AUTH & FIRESTORE)
 * LOCAL-FIRST WITH AUTOMATIC BI-DIRECTIONAL CLOUD REPLICATION & GATEKEEPER
 */

import { store } from './state.js';
import { soundFx } from './audio-synth.js';

// Default Firebase Configuration (pitcrew-salud)
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCrEb6csrqMuc31mxbTYgWHAmsBmDOTW0k",
  authDomain: "pitcrew-salud.firebaseapp.com",
  projectId: "pitcrew-salud",
  storageBucket: "pitcrew-salud.firebasestorage.app",
  messagingSenderId: "954608400986",
  appId: "1:954608400986:web:4696d805523eacf39a3663",
  measurementId: "G-420S99N1QX"
};

export class CloudSyncManager {
  constructor() {
    this.firebaseApp = null;
    this.auth = null;
    this.db = null;
    this.analytics = null;
    this.currentUser = null;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncTimer = null;
    this.isAuthInitialized = false;
    this.authCallbacks = [];

    // Gatekeeper Fullscreen UI Elements
    this.gatekeeperScreen = document.getElementById('auth-gatekeeper-screen');
    this.gatekeeperLoading = document.getElementById('auth-loading-screen');
    this.gatekeeperTabLogin = document.getElementById('gatekeeper-tab-login');
    this.gatekeeperTabRegister = document.getElementById('gatekeeper-tab-register');
    this.gatekeeperErrorBanner = document.getElementById('gatekeeper-error-banner');
    this.btnGatekeeperGoogle = document.getElementById('btn-gatekeeper-google');
    this.formGatekeeperAuth = document.getElementById('form-gatekeeper-auth');
    this.gatekeeperNameGroup = document.getElementById('gatekeeper-name-group');
    this.gatekeeperNameInput = document.getElementById('gatekeeper-name-input');
    this.gatekeeperEmailInput = document.getElementById('gatekeeper-email-input');
    this.gatekeeperPasswordInput = document.getElementById('gatekeeper-password-input');
    this.btnGatekeeperForgot = document.getElementById('btn-gatekeeper-forgot');
    this.btnGatekeeperSubmit = document.getElementById('btn-gatekeeper-submit');
    this.gatekeeperMode = 'LOGIN';

    // Header UI elements
    this.headerUserBtn = document.getElementById('header-user-badge-btn');
    this.headerUserDot = document.getElementById('header-user-sync-dot');
    this.headerUserText = document.getElementById('header-user-name');

    // Account Modal elements (legacy / header popup)
    this.authModal = document.getElementById('auth-modal');
    this.btnCloseAuth = document.getElementById('btn-close-auth-modal');
    this.btnGoogleLogin = document.getElementById('btn-google-signin');
    this.formEmailAuth = document.getElementById('form-email-auth');
    this.btnSwitchToRegister = document.getElementById('btn-switch-auth-register');
    this.btnSwitchToLogin = document.getElementById('btn-switch-auth-login');
    this.btnForgotPassword = document.getElementById('btn-forgot-password');
    this.authErrorBanner = document.getElementById('auth-error-banner');
    this.accountDetailsView = document.getElementById('auth-account-view');
    this.accountFormView = document.getElementById('auth-forms-view');
    this.btnLogout = document.getElementById('btn-auth-logout');
    this.btnManualSync = document.getElementById('btn-manual-sync-now');
    this.syncStatusText = document.getElementById('auth-sync-status-text');

    // Settings View Account Card elements
    this.settingsUserEmailDisplay = document.getElementById('settings-user-email-display');
    this.settingsUserSyncText = document.getElementById('settings-user-sync-text');
    this.btnSettingsSync = document.getElementById('btn-settings-sync-now');
    this.btnSettingsLogout = document.getElementById('btn-settings-logout');

    // Config setup elements (in case custom override is needed)
    this.btnToggleConfigBox = document.getElementById('btn-toggle-firebase-config');
    this.configSetupBox = document.getElementById('firebase-config-setup-box');
    this.configTextarea = document.getElementById('firebase-config-textarea');
    this.btnSaveConfig = document.getElementById('btn-save-firebase-config');
    this.configStatusNotice = document.getElementById('firebase-config-status-notice');
  }

  async init() {
    this.bindEvents();
    await this.initFirebase();
    this.setupOnlineListeners();
  }

  // Subscribe to Auth State Changes
  onAuthStateChange(callback) {
    if (typeof callback === 'function') {
      this.authCallbacks.push(callback);
      if (this.isAuthInitialized) {
        callback(this.currentUser);
      }
    }
  }

  notifyAuthState(user) {
    this.isAuthInitialized = true;
    this.currentUser = user;
    this.authCallbacks.forEach(cb => {
      try {
        cb(user);
      } catch (err) {
        console.error('Error in auth callback:', err);
      }
    });
  }

  // Load custom or default config
  getFirebaseConfig() {
    try {
      const custom = localStorage.getItem('pitcrew_firebase_config_v4');
      if (custom) {
        const parsed = JSON.parse(custom);
        if (parsed && parsed.apiKey && parsed.projectId) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not parse custom firebase config:', e);
    }
    return DEFAULT_FIREBASE_CONFIG;
  }

  // Parse raw text or JS code pasted by user
  parseFirebaseConfigText(rawText) {
    if (!rawText) return null;
    let text = rawText.trim();

    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      text = objectMatch[0];
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      const extract = (key) => {
        const match = text.match(new RegExp(`(?:["']?${key}["']?\\s*:\\s*["']([^"']+)["'])`, 'i'));
        return match ? match[1] : '';
      };

      const apiKey = extract('apiKey');
      const authDomain = extract('authDomain');
      const projectId = extract('projectId');
      const storageBucket = extract('storageBucket');
      const messagingSenderId = extract('messagingSenderId');
      const appId = extract('appId');
      const measurementId = extract('measurementId');

      if (apiKey && projectId) {
        return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId };
      }
    }
    return null;
  }

  saveFirebaseConfig(cfg) {
    try {
      localStorage.setItem('pitcrew_firebase_config_v4', JSON.stringify(cfg));
      soundFx.playHydrationSound();
      this.initFirebase();
      return true;
    } catch (e) {
      console.error('Error saving firebase config:', e);
      return false;
    }
  }

  async initFirebase() {
    const config = this.getFirebaseConfig();
    const hasConfig = Boolean(config && config.apiKey && config.projectId);

    if (this.configStatusNotice) {
      if (hasConfig) {
        this.configStatusNotice.innerHTML = `
          <span style="color: var(--f1-green); font-weight: bold;">🟢 Proyecto Conectado:</span> 
          <strong style="color: var(--text-pure);">${config.projectId}</strong>
        `;
      } else {
        this.configStatusNotice.innerHTML = `
          <span style="color: var(--f1-amber); font-weight: bold;">🟡 Estado:</span> 
          <span>Modo Local</span>
        `;
      }
    }

    if (!hasConfig) {
      this.updateUIForLoggedOut();
      this.notifyAuthState(null);
      return;
    }

    try {
      // Dynamic import of Firebase SDK v10 (ESM CDN)
      const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      const { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      const { getFirestore, doc, setDoc, getDoc, collection, getDocs, enableIndexedDbPersistence } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

      const existingApps = getApps();
      this.firebaseApp = existingApps.length > 0 ? getApp() : initializeApp(config);
      this.auth = getAuth(this.firebaseApp);
      this.db = getFirestore(this.firebaseApp);

      this.firebaseSDK = {
        GoogleAuthProvider,
        signInWithPopup,
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        sendPasswordResetEmail,
        signOut,
        doc,
        setDoc,
        getDoc,
        collection,
        getDocs
      };

      // Enable offline persistence in Firestore
      try {
        await enableIndexedDbPersistence(this.db);
      } catch (err) {
        if (err.code !== 'failed-precondition') {
          console.warn('Firestore persistence notice:', err.message);
        }
      }

      // Initialize Analytics if supported
      try {
        const { getAnalytics, isSupported } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js');
        if (await isSupported() && config.measurementId) {
          this.analytics = getAnalytics(this.firebaseApp);
        }
      } catch (analyticsErr) {
        console.warn('Analytics initialization skipped:', analyticsErr);
      }

      // Listen for auth state changes & session persistence
      onAuthStateChanged(this.auth, (user) => {
        if (user) {
          this.currentUser = user;
          this.updateUIForLoggedIn(user);
          this.syncWithCloud();
          this.notifyAuthState(user);
        } else {
          this.currentUser = null;
          this.updateUIForLoggedOut();
          this.notifyAuthState(null);
        }
      });

    } catch (err) {
      console.warn('Firebase initialization error:', err);
      this.updateUIForLoggedOut();
      this.notifyAuthState(null);
    }
  }

  setupOnlineListeners() {
    window.addEventListener('online', () => {
      if (this.currentUser) {
        this.syncWithCloud();
      }
    });

    // Auto-sync when state changes
    store.on('today:updated', () => {
      this.debounceSync();
    });

    store.on('profile:updated', () => {
      this.debounceSync();
    });
  }

  debounceSync() {
    if (!this.currentUser) return;
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.syncWithCloud();
    }, 3000);
  }

  bindEvents() {
    // 1. Gatekeeper Tabs (Login vs Register)
    if (this.gatekeeperTabLogin) {
      this.gatekeeperTabLogin.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.setGatekeeperMode('LOGIN');
      });
    }

    if (this.gatekeeperTabRegister) {
      this.gatekeeperTabRegister.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.setGatekeeperMode('REGISTER');
      });
    }

    // 2. Gatekeeper Google Sign-in
    if (this.btnGatekeeperGoogle) {
      this.btnGatekeeperGoogle.addEventListener('click', () => {
        this.signInWithGoogle();
      });
    }

    // 3. Gatekeeper Form Submit (Email Auth)
    if (this.formGatekeeperAuth) {
      this.formGatekeeperAuth.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleGatekeeperEmailAuth();
      });
    }

    // 4. Gatekeeper Forgot Password
    if (this.btnGatekeeperForgot) {
      this.btnGatekeeperForgot.addEventListener('click', () => {
        this.handleGatekeeperForgotPassword();
      });
    }

    // 5. Header User Badge -> Open Account Modal
    if (this.headerUserBtn) {
      this.headerUserBtn.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.openAuthModal();
      });
    }

    // 6. Settings Buttons (Sync & Direct Logout)
    if (this.btnSettingsSync) {
      this.btnSettingsSync.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.syncWithCloud(true);
      });
    }

    if (this.btnSettingsLogout) {
      this.btnSettingsLogout.addEventListener('click', () => {
        this.signOutUser();
      });
    }

    // 7. Modal Controls
    if (this.btnCloseAuth) {
      this.btnCloseAuth.addEventListener('click', () => {
        this.closeAuthModal();
      });
    }

    if (this.btnGoogleLogin) {
      this.btnGoogleLogin.addEventListener('click', () => {
        this.signInWithGoogle();
      });
    }

    if (this.formEmailAuth) {
      this.formEmailAuth.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleEmailAuth();
      });
    }

    if (this.btnLogout) {
      this.btnLogout.addEventListener('click', () => {
        this.signOutUser();
      });
    }

    if (this.btnManualSync) {
      this.btnManualSync.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.syncWithCloud(true);
      });
    }

    if (this.btnForgotPassword) {
      this.btnForgotPassword.addEventListener('click', () => {
        this.handleForgotPassword();
      });
    }

    // 8. Config Accordion
    if (this.btnToggleConfigBox && this.configSetupBox) {
      this.btnToggleConfigBox.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.configSetupBox.classList.toggle('hidden');
        if (!this.configSetupBox.classList.contains('hidden')) {
          const cfg = this.getFirebaseConfig();
          if (this.configTextarea && cfg && cfg.apiKey) {
            this.configTextarea.value = JSON.stringify(cfg, null, 2);
          }
        }
      });
    }

    if (this.btnSaveConfig && this.configTextarea) {
      this.btnSaveConfig.addEventListener('click', () => {
        const raw = this.configTextarea.value;
        const parsed = this.parseFirebaseConfigText(raw);
        if (!parsed || !parsed.apiKey || !parsed.projectId) {
          alert('No se pudo reconocer la configuración. Asegúrate de copiar el objeto con apiKey y projectId.');
          return;
        }

        const saved = this.saveFirebaseConfig(parsed);
        if (saved) {
          alert(`✅ ¡Credenciales guardadas para el proyecto ${parsed.projectId}!`);
          if (this.configSetupBox) this.configSetupBox.classList.add('hidden');
          this.clearAuthError();
        }
      });
    }
  }

  setGatekeeperMode(mode) {
    this.gatekeeperMode = mode;
    this.clearAuthError();

    if (mode === 'REGISTER') {
      if (this.gatekeeperTabRegister) this.gatekeeperTabRegister.classList.add('active');
      if (this.gatekeeperTabLogin) this.gatekeeperTabLogin.classList.remove('active');
      if (this.gatekeeperNameGroup) this.gatekeeperNameGroup.classList.remove('hidden');
      if (this.btnGatekeeperSubmit) this.btnGatekeeperSubmit.textContent = 'Crear Cuenta & Sincronizar';
      const forgotRow = document.getElementById('gatekeeper-forgot-row');
      if (forgotRow) forgotRow.classList.add('hidden');
    } else {
      if (this.gatekeeperTabLogin) this.gatekeeperTabLogin.classList.add('active');
      if (this.gatekeeperTabRegister) this.gatekeeperTabRegister.classList.remove('active');
      if (this.gatekeeperNameGroup) this.gatekeeperNameGroup.classList.add('hidden');
      if (this.btnGatekeeperSubmit) this.btnGatekeeperSubmit.textContent = 'Iniciar Sesión';
      const forgotRow = document.getElementById('gatekeeper-forgot-row');
      if (forgotRow) forgotRow.classList.remove('hidden');
    }
  }

  showAuthError(msg) {
    if (this.gatekeeperErrorBanner) {
      this.gatekeeperErrorBanner.innerHTML = msg;
      this.gatekeeperErrorBanner.classList.remove('hidden');
    }
    if (this.authErrorBanner) {
      this.authErrorBanner.innerHTML = msg;
      this.authErrorBanner.classList.remove('hidden');
    }
  }

  clearAuthError() {
    if (this.gatekeeperErrorBanner) {
      this.gatekeeperErrorBanner.textContent = '';
      this.gatekeeperErrorBanner.classList.add('hidden');
    }
    if (this.authErrorBanner) {
      this.authErrorBanner.textContent = '';
      this.authErrorBanner.classList.add('hidden');
    }
  }

  async signInWithGoogle() {
    const config = this.getFirebaseConfig();
    if (!this.auth || !this.firebaseSDK || !config.apiKey) {
      this.showAuthError('⚠️ Servicio de autenticación no inicializado aún.');
      return;
    }

    try {
      this.clearAuthError();
      const provider = new this.firebaseSDK.GoogleAuthProvider();
      await this.firebaseSDK.signInWithPopup(this.auth, provider);
      soundFx.playHydrationSound();
      this.closeAuthModal();
    } catch (err) {
      console.error('Google Sign-in error:', err);
      this.showAuthError(this.translateAuthError(err.code || err.message));
    }
  }

  async handleGatekeeperEmailAuth() {
    const config = this.getFirebaseConfig();
    if (!this.auth || !this.firebaseSDK || !config.apiKey) {
      this.showAuthError('⚠️ Servicio de autenticación no inicializado.');
      return;
    }

    const email = this.gatekeeperEmailInput ? this.gatekeeperEmailInput.value.trim() : '';
    const password = this.gatekeeperPasswordInput ? this.gatekeeperPasswordInput.value : '';
    const displayName = this.gatekeeperNameInput ? this.gatekeeperNameInput.value.trim() : '';

    if (!email || !password) {
      this.showAuthError('Por favor completa tu correo y contraseña.');
      return;
    }

    try {
      this.clearAuthError();
      if (this.gatekeeperMode === 'REGISTER') {
        const cred = await this.firebaseSDK.createUserWithEmailAndPassword(this.auth, email, password);
        if (displayName && cred.user) {
          store.updateProfile({ userName: displayName });
        }
      } else {
        await this.firebaseSDK.signInWithEmailAndPassword(this.auth, email, password);
      }
      soundFx.playHydrationSound();
    } catch (err) {
      console.error('Gatekeeper Auth error:', err);
      this.showAuthError(this.translateAuthError(err.code || err.message));
    }
  }

  async handleGatekeeperForgotPassword() {
    if (!this.auth || !this.firebaseSDK) return;
    const email = this.gatekeeperEmailInput ? this.gatekeeperEmailInput.value.trim() : '';

    if (!email) {
      this.showAuthError('Escribe tu correo en la casilla para enviarte el enlace de recuperación.');
      return;
    }

    try {
      await this.firebaseSDK.sendPasswordResetEmail(this.auth, email);
      alert(`✅ Se ha enviado un enlace de recuperación a ${email}. Revisa tu bandeja de entrada.`);
    } catch (err) {
      this.showAuthError(this.translateAuthError(err.code || err.message));
    }
  }

  async handleEmailAuth() {
    const emailInput = document.getElementById('auth-email-input');
    const passwordInput = document.getElementById('auth-password-input');
    const nameInput = document.getElementById('auth-name-input');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const displayName = nameInput ? nameInput.value.trim() : '';

    if (!email || !password) {
      this.showAuthError('Por favor completa todos los campos.');
      return;
    }

    try {
      this.clearAuthError();
      if (this.authMode === 'REGISTER') {
        const cred = await this.firebaseSDK.createUserWithEmailAndPassword(this.auth, email, password);
        if (displayName && cred.user) {
          store.updateProfile({ userName: displayName });
        }
      } else {
        await this.firebaseSDK.signInWithEmailAndPassword(this.auth, email, password);
      }
      soundFx.playHydrationSound();
      this.closeAuthModal();
    } catch (err) {
      console.error('Email auth error:', err);
      this.showAuthError(this.translateAuthError(err.code || err.message));
    }
  }

  async handleForgotPassword() {
    if (!this.auth || !this.firebaseSDK) return;
    const emailInput = document.getElementById('auth-email-input');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) {
      this.showAuthError('Ingresa tu correo para enviarte el enlace de recuperación.');
      return;
    }

    try {
      await this.firebaseSDK.sendPasswordResetEmail(this.auth, email);
      alert(`Se ha enviado un enlace de restablecimiento a ${email}. Revisa tu bandeja de entrada.`);
    } catch (err) {
      this.showAuthError(this.translateAuthError(err.code || err.message));
    }
  }

  async signOutUser() {
    if (this.auth && this.firebaseSDK) {
      try {
        await this.firebaseSDK.signOut(this.auth);
        soundFx.playTactileClick();
        this.closeAuthModal();
        this.updateUIForLoggedOut();
        this.notifyAuthState(null);
      } catch (err) {
        console.error('Sign out error:', err);
      }
    }
  }

  openAuthModal() {
    if (this.authModal) {
      this.authModal.classList.remove('hidden');
      if (this.currentUser) {
        if (this.accountDetailsView) this.accountDetailsView.classList.remove('hidden');
        if (this.accountFormView) this.accountFormView.classList.add('hidden');
      } else {
        if (this.accountDetailsView) this.accountDetailsView.classList.add('hidden');
        if (this.accountFormView) this.accountFormView.classList.remove('hidden');
      }
    }
  }

  closeAuthModal() {
    if (this.authModal) {
      this.authModal.classList.add('hidden');
    }
  }

  // Cloud Sync Engine
  async syncWithCloud(forceFeedback = false) {
    if (!this.currentUser || !this.db || !this.firebaseSDK) return;
    if (this.isSyncing) return;

    this.isSyncing = true;
    this.updateSyncBadge('syncing');

    try {
      const uid = this.currentUser.uid;
      const { doc, setDoc, getDoc } = this.firebaseSDK;

      // 1. Sync User Profile
      const profileDocRef = doc(this.db, 'users', uid, 'data', 'profile');
      const profileSnap = await getDoc(profileDocRef);

      if (profileSnap.exists()) {
        const cloudProfile = profileSnap.data();
        store.profile = { ...store.profile, ...cloudProfile, isOnboarded: true };
        store.save('pitcrew_profile_v4', store.profile);
      } else {
        await setDoc(profileDocRef, store.profile, { merge: true });
      }

      // 2. Sync Today's Log
      const todayDate = store.today.date;
      const todayDocRef = doc(this.db, 'users', uid, 'days', todayDate);
      const todaySnap = await getDoc(todayDocRef);

      if (todaySnap.exists()) {
        const cloudToday = todaySnap.data();
        const mergedToday = { ...cloudToday, ...store.today };
        store.today = mergedToday;
        store.save('pitcrew_today_v4', mergedToday);
        await setDoc(todayDocRef, mergedToday, { merge: true });
      } else {
        await setDoc(todayDocRef, store.today);
      }

      this.lastSyncTime = new Date();
      this.isSyncing = false;
      this.updateSyncBadge('synced');

      if (forceFeedback) {
        alert('✅ ¡Sincronización en la nube completada exitosamente!');
      }

    } catch (err) {
      console.warn('Cloud sync error:', err);
      this.isSyncing = false;
      this.updateSyncBadge('offline');
    }
  }

  updateSyncBadge(status) {
    if (this.headerUserDot) {
      if (status === 'synced') {
        this.headerUserDot.className = 'status-dot active';
        if (this.syncStatusText) this.syncStatusText.textContent = `Sincronizado: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        if (this.settingsUserSyncText) this.settingsUserSyncText.textContent = `Sincronizado: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else if (status === 'syncing') {
        this.headerUserDot.className = 'status-dot blinking';
        if (this.syncStatusText) this.syncStatusText.textContent = 'Sincronizando con la nube...';
        if (this.settingsUserSyncText) this.settingsUserSyncText.textContent = 'Sincronizando...';
      } else {
        this.headerUserDot.className = 'status-dot offline';
        if (this.syncStatusText) this.syncStatusText.textContent = 'Modo Local / Sin conexión';
        if (this.settingsUserSyncText) this.settingsUserSyncText.textContent = 'Desconectado';
      }
    }
  }

  updateUIForLoggedIn(user) {
    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Piloto');
    const userEmail = user.email || 'Conectado con Google';

    if (this.headerUserText) {
      this.headerUserText.textContent = displayName;
    }
    if (this.settingsUserEmailDisplay) {
      this.settingsUserEmailDisplay.textContent = userEmail;
    }
    const accEmail = document.getElementById('auth-account-email');
    if (accEmail) accEmail.textContent = userEmail;

    this.updateSyncBadge('synced');

    // Hide Loading & Gatekeeper screens
    if (this.gatekeeperLoading) this.gatekeeperLoading.classList.add('hidden');
    if (this.gatekeeperScreen) this.gatekeeperScreen.classList.add('hidden');
  }

  updateUIForLoggedOut() {
    if (this.headerUserText) {
      this.headerUserText.textContent = 'Nube';
    }
    if (this.headerUserDot) {
      this.headerUserDot.className = 'status-dot offline';
    }
    if (this.settingsUserEmailDisplay) {
      this.settingsUserEmailDisplay.textContent = 'No autenticado';
    }
    if (this.syncStatusText) {
      this.syncStatusText.textContent = 'Modo Local';
    }

    // Hide Loading, show Gatekeeper
    if (this.gatekeeperLoading) this.gatekeeperLoading.classList.add('hidden');
    if (this.gatekeeperScreen) this.gatekeeperScreen.classList.remove('hidden');
  }

  translateAuthError(code) {
    switch (code) {
      case 'auth/invalid-email':
        return 'El formato de correo no es válido.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Correo o contraseña incorrectos.';
      case 'auth/email-already-in-use':
        return 'Ya existe una cuenta con este correo. Inicia sesión en su lugar.';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.';
      case 'auth/popup-closed-by-user':
        return 'Se cerró la ventana de Google antes de finalizar.';
      case 'auth/unauthorized-domain':
        return 'Dominio no autorizado en Firebase Console.';
      default:
        return `Error de autenticación: ${code}`;
    }
  }
}
