/**
 * Google Authentication Service
 * 
 * Handles OAuth 2.0 authentication with Google using the
 * Google Identity Services (GIS) library with PKCE flow.
 * 
 * This is a frontend-only implementation - no backend required!
 * 
 * Setup required:
 * 1. Create a project in Google Cloud Console
 * 2. Enable Google Drive API
 * 3. Create OAuth 2.0 Client ID (Web application)
 * 4. Add authorized JavaScript origins
 * 5. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable
 */

import { debug } from '@/lib/utils/debug';
import { SYNC_CONSTANTS, type GoogleUserInfo } from './types';

// Google Identity Services types
interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
  callback: (response: TokenResponse) => void;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface Google {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type: string; message: string }) => void;
      }) => TokenClient;
      revoke: (token: string, callback?: () => void) => void;
      hasGrantedAllScopes: (response: TokenResponse, ...scopes: string[]) => boolean;
    };
  };
}

declare global {
  interface Window {
    google?: Google;
  }
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'moodboard-google-access-token',
  TOKEN_EXPIRY: 'moodboard-google-token-expiry',
  USER_EMAIL: 'moodboard-google-user-email',
  USER_ID: 'moodboard-google-user-id',
} as const;

class GoogleAuthService {
  private tokenClient: TokenClient | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private pendingAuthResolve: ((token: string) => void) | null = null;
  private pendingAuthReject: ((error: Error) => void) | null = null;

  /**
   * Get the Google Client ID from environment variables
   */
  private getClientId(): string {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error(
        'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured. ' +
        'Please add it to your .env.local file.'
      );
    }
    return clientId;
  }

  /**
   * Load the Google Identity Services script
   */
  private loadGISScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }

      // Check if script is already in DOM
      const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
        return;
      }

      // Load script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize the auth service
   * Must be called before using other methods
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('GoogleAuth can only be used in browser');
    }

    await this.loadGISScript();

    const clientId = this.getClientId();
    const scope = `${SYNC_CONSTANTS.DRIVE_SCOPE} ${SYNC_CONSTANTS.PROFILE_SCOPE}`;

    this.tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (response) => this.handleTokenResponse(response),
      error_callback: (error) => this.handleAuthError(error),
    });

    this.isInitialized = true;
  }

  /**
   * Handle token response from Google
   */
  private handleTokenResponse(response: TokenResponse): void {
    if (response.error) {
      const error = new Error(response.error_description || response.error);
      this.pendingAuthReject?.(error);
      this.pendingAuthResolve = null;
      this.pendingAuthReject = null;
      return;
    }

    // Store token
    const expiryTime = Date.now() + (response.expires_in * 1000);
    this.storeToken(response.access_token, expiryTime);

    // Fetch user info
    this.fetchUserInfo(response.access_token).catch(console.error);

    // Resolve pending promise
    this.pendingAuthResolve?.(response.access_token);
    this.pendingAuthResolve = null;
    this.pendingAuthReject = null;
  }

  /**
   * Handle auth errors
   */
  private handleAuthError(error: { type: string; message: string }): void {
    const err = new Error(`Google Auth Error: ${error.message} (${error.type})`);
    this.pendingAuthReject?.(err);
    this.pendingAuthResolve = null;
    this.pendingAuthReject = null;
  }

  /**
   * Store token in localStorage
   */
  private storeToken(token: string, expiry: number): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiry.toString());
  }

  /**
   * Clear stored credentials
   */
  private clearStoredCredentials(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
  }

  /**
   * Fetch and store user info
   */
  private async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userInfo: GoogleUserInfo = await response.json();

    // Store user info
    localStorage.setItem(STORAGE_KEYS.USER_EMAIL, userInfo.email);
    localStorage.setItem(STORAGE_KEYS.USER_ID, userInfo.id);

    return userInfo;
  }

  /**
   * Sign in with Google
   * Opens Google's consent popup and returns the access token
   */
  async signIn(): Promise<string> {
    await this.initialize();

    if (!this.tokenClient) {
      throw new Error('Token client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.pendingAuthResolve = resolve;
      this.pendingAuthReject = reject;

      // Request token - this opens the Google popup
      this.tokenClient!.requestAccessToken({ prompt: 'consent' });
    });
  }

  /**
   * Sign out and revoke access
   */
  async signOut(): Promise<void> {
    const token = this.getStoredToken();

    if (token && window.google?.accounts?.oauth2) {
      // Revoke the token
      window.google.accounts.oauth2.revoke(token, () => {
        debug.info('[GoogleAuth] Token revoked');
      });
    }

    this.clearStoredCredentials();
  }

  /**
   * Get stored access token if valid
   */
  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;

    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);

    if (!token || !expiry) return null;

    // Check if expired (with 5 minute buffer)
    const expiryTime = parseInt(expiry, 10);
    if (Date.now() > expiryTime - 5 * 60 * 1000) {
      return null;
    }

    return token;
  }

  /**
   * Get a valid access token, refreshing if needed
   * For GIS, we need to re-prompt the user if the token is expired
   */
  async getAccessToken(): Promise<string> {
    const storedToken = this.getStoredToken();
    if (storedToken) {
      return storedToken;
    }

    // Token expired or missing - need to re-authenticate
    // GIS doesn't support refresh tokens in browser-only flow
    // We'll prompt silently first, then with consent if needed
    await this.initialize();

    if (!this.tokenClient) {
      throw new Error('Token client not initialized');
    }

    return new Promise((resolve, reject) => {
      this.pendingAuthResolve = resolve;
      this.pendingAuthReject = reject;

      // Try without prompt first (silent refresh if user already granted)
      this.tokenClient!.requestAccessToken({ prompt: '' });
    });
  }

  /**
   * Check if user is signed in
   */
  isSignedIn(): boolean {
    return this.getStoredToken() !== null;
  }

  /**
   * Get stored user email
   */
  getUserEmail(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
  }

  /**
   * Get stored user ID
   */
  getUserId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.USER_ID);
  }

  /**
   * Get token expiry time
   */
  getTokenExpiry(): Date | null {
    if (typeof window === 'undefined') return null;
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    if (!expiry) return null;
    return new Date(parseInt(expiry, 10));
  }
}

// Singleton instance
export const googleAuth = new GoogleAuthService();
