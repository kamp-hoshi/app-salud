/**
 * PIT CREW TELEMETRY & HEALTH (DISAUTONOMÍA / POTS / PACING V4.0 MASTER)
 * APPLICATION ORCHESTRATOR & PWA CONTROLLER WITH AUTHENTICATION GATEKEEPER
 */

import { store } from './state.js';
import { soundFx } from './audio-synth.js';
import { OnboardingManager } from './onboarding.js';
import { LocalOCRScanner } from './local-ocr.js';
import { WeatherTelemetry } from './weather-telemetry.js';
import { HydrationTracker } from './hydration.js';
import { SymptomAuditManager } from './symptoms.js';
import { DecisionEngine } from './decision-engine.js';
import { EmergencyCrisisManager } from './emergency.js';
import { HistoryTelemetryManager } from './history.js';
import { CloudSyncManager } from './cloud-sync.js';
import { ReminderManager } from './reminders.js';
import { MealTracker } from './meals.js';

class AppController {
  constructor() {
    this.currentView = 'telemetry';
    this.deferredInstallPrompt = null;
    this.isAuthenticated = false;
  }

  init() {
    // 1. Initialize Sub-modules
    this.onboarding = new OnboardingManager();
    this.onboarding.init();

    this.cloudSync = new CloudSyncManager();
    this.cloudSync.init();

    this.ocrScanner = new LocalOCRScanner();
    this.ocrScanner.init();

    this.weather = new WeatherTelemetry();
    this.weather.init();

    this.hydration = new HydrationTracker();
    this.hydration.init();

    this.meals = new MealTracker();
    this.meals.init();

    this.symptoms = new SymptomAuditManager();
    this.symptoms.init();

    this.decisionEngine = new DecisionEngine();
    this.decisionEngine.init();

    this.reminders = new ReminderManager();
    this.reminders.init();

    this.emergency = new EmergencyCrisisManager();
    this.emergency.init();

    this.history = new HistoryTelemetryManager();
    this.history.init();

    // 2. Setup Routing and Dock Navigation
    this.bindNavigation();

    // 3. Register Service Worker & Install Prompt
    this.setupPWA();

    // 4. Update Header Subtitle with Diagnosis
    this.updateHeaderProfile();
    store.on('profile:updated', () => this.updateHeaderProfile());

    // 5. Connect Authentication Gatekeeper Listener
    this.cloudSync.onAuthStateChange((user) => {
      this.handleAuthStateChange(user);
    });
  }

  handleAuthStateChange(user) {
    const appRoot = document.getElementById('app-root');
    const loadingScreen = document.getElementById('auth-loading-screen');
    const gatekeeperScreen = document.getElementById('auth-gatekeeper-screen');

    if (user) {
      // User is authenticated
      this.isAuthenticated = true;

      // Hide gatekeeper & loading splash
      if (loadingScreen) loadingScreen.classList.add('hidden');
      if (gatekeeperScreen) gatekeeperScreen.classList.add('hidden');

      // Show Main Application
      if (appRoot) appRoot.classList.remove('hidden');

      // Check for first-time calibration onboarding
      this.onboarding.checkAndShowOnboarding();

      // Restore active view from URL hash
      this.handleRouteFromHash();

    } else {
      // User is logged out / unauthenticated
      this.isAuthenticated = false;

      // Hide Main Application & Modals
      if (appRoot) appRoot.classList.add('hidden');
      if (this.onboarding) this.onboarding.hideOnboarding();

      const shieldModal = document.getElementById('medical-shield-modal');
      if (shieldModal) shieldModal.classList.add('hidden');

      // Hide Loading Splash & Show Gatekeeper Screen
      if (loadingScreen) loadingScreen.classList.add('hidden');
      if (gatekeeperScreen) {
        gatekeeperScreen.classList.remove('hidden');
        this.cloudSync.setGatekeeperMode('LOGIN');
      }
    }
  }

  updateHeaderProfile() {
    const diagEl = document.getElementById('header-user-diag');
    if (diagEl) {
      diagEl.textContent = store.profile.diagnosis || 'POTS / DISAUTONOMÍA';
    }
  }

  bindNavigation() {
    // Dock Tab Buttons
    document.querySelectorAll('.dock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.isAuthenticated) return;
        soundFx.playTactileClick();
        const viewId = btn.dataset.view;
        this.switchView(viewId);
        window.location.hash = `#${viewId}`;
      });
    });

    // Handle Hash changes (back/forward navigation)
    window.addEventListener('hashchange', () => {
      if (this.isAuthenticated) {
        this.handleRouteFromHash();
      }
    });
  }

  handleRouteFromHash() {
    if (!this.isAuthenticated) return;

    const hash = window.location.hash.replace('#', '');
    const validViews = ['telemetry', 'symptoms', 'pacing', 'sos', 'settings', 'history'];
    if (validViews.includes(hash)) {
      this.switchView(hash);
    } else {
      this.switchView('telemetry');
    }
  }

  switchView(viewId) {
    if (!this.isAuthenticated) return;

    this.currentView = viewId;

    // Toggle active view sections
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Toggle active dock buttons
    document.querySelectorAll('.dock-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  setupPWA() {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('Pit Crew PWA Service Worker Registered:', reg.scope);
          })
          .catch((err) => {
            console.warn('Service Worker registration failed:', err);
          });
      });
    }

    // PWA Install Prompt Capture
    const installBanner = document.getElementById('pwa-install-banner');
    const btnInstall = document.getElementById('btn-pwa-install');
    const btnDismiss = document.getElementById('btn-pwa-dismiss');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      if (installBanner && this.isAuthenticated) {
        installBanner.classList.remove('hidden');
      }
    });

    if (btnInstall) {
      btnInstall.addEventListener('click', async () => {
        if (this.deferredInstallPrompt) {
          this.deferredInstallPrompt.prompt();
          const { outcome } = await this.deferredInstallPrompt.userChoice;
          console.log(`PWA Install outcome: ${outcome}`);
          this.deferredInstallPrompt = null;
          if (installBanner) installBanner.classList.add('hidden');
        }
      });
    }

    if (btnDismiss && installBanner) {
      btnDismiss.addEventListener('click', () => {
        installBanner.classList.add('hidden');
      });
    }
  }
}

// Instantiate on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.init();
  window.PitCrewApp = app;
});
