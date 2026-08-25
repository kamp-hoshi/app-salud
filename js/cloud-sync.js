/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * MODULE 6: CLOUD SYNC & USER ACCOUNTS (FIREBASE AUTH & FIRESTORE)
 * LOCAL-FIRST WITH AUTOMATIC BI-DIRECTIONAL CLOUD REPLICATION
 */

import { store } from './state.js';
import { soundFx } from './audio-synth.js';

// Default Firebase Configuration (Can be customized by user in Settings or environment)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export class CloudSyncManager {
  constructor() {
    this.firebaseApp = null;
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncTimer = null;

    // UI elements
    this.headerUserBtn = document.getElementById('header-user-badge-btn');
    this.headerUserDot = document.getElementById('header-user-sync-dot');
    this.headerUserText = document.getElementById('header-user-name');
    
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
  }

  async init() {
    this.bindEvents();
    this.initFirebase();
    this.setupOnlineListeners();
  }

  // Load custom or default config
  getFirebaseConfig() {
    try {
      const custom = localStorage.getItem('pitcrew_firebase_config_v4');
      if (custom) {
        return JSON.parse(custom);
      }
    } catch (e) {
      console.warn('Could not parse custom firebase config:', e);
    }
    return DEFAULT_FIREBASE_CONFIG;
  }

  saveFirebaseConfig(cfg) {
    try {
      localStorage.setItem('pitcrew_firebase_config_v4', JSON.stringify(cfg));
      this.initFirebase();
    } catch (e) {
      console.error('Error saving firebase config:', e);
    }
  }

  async initFirebase() {
    const config = this.getFirebaseConfig();
    if (!config || !config.apiKey || !config.projectId) {
      this.updateUIForLoggedOut();
      return;
    }

    try {
      // Dynamic import of Firebase SDK v10 (ESM CDN)
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      const { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      const { getFirestore, doc, setDoc, getDoc, collection, getDocs, enableIndexedDbPersistence } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

      this.firebaseApp = initializeApp(config);
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

      // Try enabling offline persistence in Firestore
      try {
        await enableIndexedDbPersistence(this.db);
      } catch (err) {
        if (err.code === 'failed-precondition') {
          console.warn('Firestore persistence failed: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
          console.warn('Firestore persistence not supported in this browser');
        }
      }

      // Listen for auth state
      onAuthStateChanged(this.auth, (user) => {
        if (user) {
          this.currentUser = user;
          this.updateUIForLoggedIn(user);
          this.syncWithCloud();
        } else {
          this.currentUser = null;
          this.updateUIForLoggedOut();
        }
      });

    } catch (err) {
      console.warn('Firebase initialization notice (running in local-first mode):', err);
      this.updateUIForLoggedOut();
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
    // Open Auth Modal from header badge & settings button
    if (this.headerUserBtn) {
      this.headerUserBtn.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.openAuthModal();
      });
    }

    const btnOpenSettings = document.getElementById('btn-open-cloud-account-settings');
    if (btnOpenSettings) {
      btnOpenSettings.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.openAuthModal();
      });
    }

    if (this.btnCloseAuth) {
      this.btnCloseAuth.addEventListener('click', () => {
        this.closeAuthModal();
      });
    }

    // Google Sign-In
    if (this.btnGoogleLogin) {
      this.btnGoogleLogin.addEventListener('click', () => {
        this.signInWithGoogle();
      });
    }

    // Email/Password Form
    if (this.formEmailAuth) {
      this.formEmailAuth.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleEmailAuth();
      });
    }

    // Switch between Login and Register views
    if (this.btnSwitchToRegister) {
      this.btnSwitchToRegister.addEventListener('click', () => {
        this.setAuthMode('REGISTER');
      });
    }

    if (this.btnSwitchToLogin) {
      this.btnSwitchToLogin.addEventListener('click', () => {
        this.setAuthMode('LOGIN');
      });
    }

    // Forgot Password
    if (this.btnForgotPassword) {
      this.btnForgotPassword.addEventListener('click', () => {
        this.handleForgotPassword();
      });
    }

    // Logout
    if (this.btnLogout) {
      this.btnLogout.addEventListener('click', () => {
        this.signOutUser();
      });
    }

    // Manual Sync Button
    if (this.btnManualSync) {
      this.btnManualSync.addEventListener('click', () => {
        soundFx.playTactileClick();
        this.syncWithCloud(true);
      });
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

  setAuthMode(mode) {
    const title = document.getElementById('auth-modal-title');
    const submitBtn = document.getElementById('btn-email-submit');
    const switchRow = document.getElementById('auth-switch-row');
    const nameGroup = document.getElementById('auth-name-group');

    this.clearAuthError();

    if (mode === 'REGISTER') {
      if (title) title.textContent = 'Crear Cuenta en la Nube';
      if (submitBtn) submitBtn.textContent = 'Registrarme y Sincronizar';
      if (nameGroup) nameGroup.classList.remove('hidden');
      if (this.btnSwitchToRegister) this.btnSwitchToRegister.classList.add('hidden');
      if (this.btnSwitchToLogin) this.btnSwitchToLogin.classList.remove('hidden');
      this.authMode = 'REGISTER';
    } else {
      if (title) title.textContent = 'Iniciar Sesión en la Nube';
      if (submitBtn) submitBtn.textContent = 'Iniciar Sesión';
      if (nameGroup) nameGroup.classList.add('hidden');
      if (this.btnSwitchToRegister) this.btnSwitchToRegister.classList.remove('hidden');
      if (this.btnSwitchToLogin) this.btnSwitchToLogin.classList.add('hidden');
      this.authMode = 'LOGIN';
    }
  }

  showAuthError(msg) {
    if (this.authErrorBanner) {
      this.authErrorBanner.textContent = msg;
      this.authErrorBanner.classList.remove('hidden');
    }
  }

  clearAuthError() {
    if (this.authErrorBanner) {
      this.authErrorBanner.textContent = '';
      this.authErrorBanner.classList.add('hidden');
    }
  }

  async signInWithGoogle() {
    if (!this.auth || !this.firebaseSDK) {
      this.showAuthError('Servicio de nube no configurado. Ingresa tus credenciales en Ajustes.');
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

  async handleEmailAuth() {
    if (!this.auth || !this.firebaseSDK) {
      this.showAuthError('Servicio de nube no configurado. Ingresa tus credenciales en Ajustes.');
      return;
    }

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
          // Update profile local
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
      } catch (err) {
        console.error('Sign out error:', err);
      }
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
        // Merge cloud profile with local profile
        store.profile = { ...store.profile, ...cloudProfile, isOnboarded: true };
        store.save('pitcrew_profile_v4', store.profile);
      } else {
        // First time cloud upload
        await setDoc(profileDocRef, store.profile, { merge: true });
      }

      // 2. Sync Today's Log
      const todayDate = store.today.date;
      const todayDocRef = doc(this.db, 'users', uid, 'days', todayDate);
      const todaySnap = await getDoc(todayDocRef);

      if (todaySnap.exists()) {
        const cloudToday = todaySnap.data();
        // Merge preferring most recent local updates
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
      console.warn('Cloud sync error (fallback to local):', err);
      this.isSyncing = false;
      this.updateSyncBadge('offline');
    }
  }

  updateSyncBadge(status) {
    if (!this.headerUserDot) return;

    if (status === 'synced') {
      this.headerUserDot.className = 'status-dot active';
      if (this.syncStatusText) this.syncStatusText.textContent = `Sincronizado: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (status === 'syncing') {
      this.headerUserDot.className = 'status-dot blinking';
      if (this.syncStatusText) this.syncStatusText.textContent = 'Sincronizando con la nube...';
    } else {
      this.headerUserDot.className = 'status-dot offline';
      if (this.syncStatusText) this.syncStatusText.textContent = 'Modo Local / Sin conexión';
    }
  }

  updateUIForLoggedIn(user) {
    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario');
    if (this.headerUserText) {
      this.headerUserText.textContent = displayName;
    }
    const accEmail = document.getElementById('auth-account-email');
    if (accEmail) accEmail.textContent = user.email || 'Conectado con Google';
    this.updateSyncBadge('synced');
  }

  updateUIForLoggedOut() {
    if (this.headerUserText) {
      this.headerUserText.textContent = 'Nube';
    }
    if (this.headerUserDot) {
      this.headerUserDot.className = 'status-dot offline';
    }
    if (this.syncStatusText) {
      this.syncStatusText.textContent = 'Modo Local (Inicia sesión para multi-dispositivo)';
    }
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
        return 'Ya existe una cuenta con este correo.';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.';
      case 'auth/popup-closed-by-user':
        return 'Se cerró la ventana de Google antes de finalizar.';
      default:
        return `Error de acceso: ${code}`;
    }
  }
}
