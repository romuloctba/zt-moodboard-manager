/**
 * Google Auth Unit Tests
 *
 * Tests the GoogleAuthService class which wraps Google Identity Services (GIS).
 *
 * ============================================================================
 * MOCK ARCHITECTURE
 * ============================================================================
 *
 * Since GIS is a third-party library loaded via script tag, we must mock:
 * - window.google.accounts.oauth2 - GIS API
 * - localStorage - Token and user info storage
 * - fetch - User info API calls
 * - document.createElement/head.appendChild - Script loading
 *
 * The GoogleAuthService is a singleton, but we test by importing the class
 * directly and creating fresh instances to avoid state leakage.
 *
 * ============================================================================
 * TESTING STRATEGY
 * ============================================================================
 *
 * 1. Mock GIS tokenClient with controllable callback triggers
 * 2. Use fake localStorage (Map-based) for isolation
 * 3. Mock fetch for userinfo endpoint
 * 4. Use vi.useFakeTimers() for expiry tests
 *
 * Note: Some tests (silent refresh, actual popup) are better suited for E2E.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// STORAGE KEYS (must match implementation)
// =============================================================================

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'moodboard-google-access-token',
  TOKEN_EXPIRY: 'moodboard-google-token-expiry',
  USER_EMAIL: 'moodboard-google-user-email',
  USER_ID: 'moodboard-google-user-id',
} as const;

// =============================================================================
// MOCK INFRASTRUCTURE
// =============================================================================

/**
 * Mock localStorage implementation
 */
const mockStorage: Map<string, string> = new Map();

const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => mockStorage.set(key, value)),
  removeItem: vi.fn((key: string) => mockStorage.delete(key)),
  clear: vi.fn(() => mockStorage.clear()),
  get length() {
    return mockStorage.size;
  },
  key: vi.fn((index: number) => Array.from(mockStorage.keys())[index] ?? null),
};

/**
 * Mock token response from GIS
 */
interface MockTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

/**
 * Mock GIS TokenClient
 */
let mockTokenClientCallback: ((response: MockTokenResponse) => void) | null = null;
let mockTokenClientErrorCallback: ((error: { type: string; message: string }) => void) | null =
  null;
let mockRequestAccessTokenCalls: Array<{ prompt?: string }> = [];

const createMockTokenClient = () => ({
  requestAccessToken: vi.fn((options?: { prompt?: string }) => {
    mockRequestAccessTokenCalls.push(options || {});
  }),
  callback: null as ((response: MockTokenResponse) => void) | null,
});

let mockTokenClient = createMockTokenClient();

/**
 * Mock GIS oauth2 API
 */
const mockOauth2 = {
  initTokenClient: vi.fn(
    (config: {
      client_id: string;
      scope: string;
      callback: (response: MockTokenResponse) => void;
      error_callback?: (error: { type: string; message: string }) => void;
    }) => {
      mockTokenClientCallback = config.callback;
      mockTokenClientErrorCallback = config.error_callback || null;
      // Reset the mock but keep the same object reference
      mockTokenClient.requestAccessToken.mockClear();
      return mockTokenClient;
    }
  ),
  revoke: vi.fn((_token: string, callback?: () => void) => {
    if (callback) callback();
  }),
  hasGrantedAllScopes: vi.fn(() => true),
};

/**
 * Mock window.google
 */
const mockGoogle = {
  accounts: {
    oauth2: mockOauth2,
  },
};

/**
 * Simulate a successful token response from GIS
 */
function simulateTokenSuccess(token = 'mock-access-token', expiresIn = 3600) {
  if (mockTokenClientCallback) {
    mockTokenClientCallback({
      access_token: token,
      expires_in: expiresIn,
      token_type: 'Bearer',
      scope: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email',
    });
  }
}

/**
 * Simulate an error response from GIS
 */
function simulateTokenError(error = 'access_denied', description = 'User cancelled') {
  if (mockTokenClientCallback) {
    mockTokenClientCallback({
      access_token: '',
      expires_in: 0,
      token_type: '',
      scope: '',
      error,
      error_description: description,
    });
  }
}

/**
 * Simulate auth error callback (popup closed, etc.)
 */
function simulateAuthError(type = 'popup_closed', message = 'Popup was closed') {
  if (mockTokenClientErrorCallback) {
    mockTokenClientErrorCallback({ type, message });
  }
}

/**
 * Mock script element for GIS loading
 */
let mockScriptOnLoad: (() => void) | null = null;
let mockScriptOnError: (() => void) | null = null;
let scriptsAppended: HTMLScriptElement[] = [];

function createMockScriptElement() {
  const script = {
    src: '',
    async: false,
    defer: false,
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  Object.defineProperty(script, 'onload', {
    set(fn: () => void) {
      mockScriptOnLoad = fn;
    },
    get() {
      return mockScriptOnLoad;
    },
  });

  Object.defineProperty(script, 'onerror', {
    set(fn: () => void) {
      mockScriptOnError = fn;
    },
    get() {
      return mockScriptOnError;
    },
  });

  return script as unknown as HTMLScriptElement;
}

// =============================================================================
// MOCK FETCH
// =============================================================================

const mockFetch = vi.fn();

// =============================================================================
// TEST SETUP
// =============================================================================

// Store original values
const originalLocalStorage = globalThis.localStorage;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  mockStorage.clear();
  mockRequestAccessTokenCalls = [];
  mockTokenClientCallback = null;
  mockTokenClientErrorCallback = null;
  mockScriptOnLoad = null;
  mockScriptOnError = null;
  scriptsAppended = [];
  mockTokenClient = createMockTokenClient();

  // Mock localStorage
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });

  // Mock fetch
  globalThis.fetch = mockFetch;

  // Default fetch mock for userinfo
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      id: 'mock-user-id',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/photo.jpg',
    }),
  });

  // Mock document.createElement for script loading
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'script') {
      return createMockScriptElement();
    }
    return document.createElement(tagName);
  });

  // Mock document.head.appendChild
  vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
    if ((node as HTMLScriptElement).src?.includes('accounts.google.com')) {
      scriptsAppended.push(node as HTMLScriptElement);
    }
    return node;
  });

  // Mock document.querySelector for existing script check
  vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
    if (selector.includes('accounts.google.com/gsi/client')) {
      return null; // No existing script by default
    }
    return null;
  });

  // Start with GIS not loaded
  Object.defineProperty(globalThis, 'window', {
    value: {
      ...globalThis.window,
      google: undefined,
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  // Restore originals
  Object.defineProperty(globalThis, 'localStorage', {
    value: originalLocalStorage,
    writable: true,
    configurable: true,
  });
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/**
 * Helper to load GIS (simulate script load completing)
 * This sets window.google AND triggers the onload callback
 */
function loadGIS() {
  // Set on both globalThis and window to ensure coverage
  (globalThis as unknown as { google: typeof mockGoogle }).google = mockGoogle;
  if (typeof window !== 'undefined') {
    (window as unknown as { google: typeof mockGoogle }).google = mockGoogle;
  }
  // Trigger the onload callback
  if (mockScriptOnLoad) {
    mockScriptOnLoad();
  }
}

/**
 * Helper to simulate GIS load failure
 */
function failGISLoad() {
  if (mockScriptOnError) {
    mockScriptOnError();
  }
}

/**
 * Reset modules and re-apply all standard mocks.
 * Used when we need a fresh module import but with custom configuration.
 */
function resetModuleAndMocks() {
  vi.resetModules();

  // Reset mock state
  mockScriptOnLoad = null;
  mockScriptOnError = null;
  scriptsAppended = [];
  mockTokenClientCallback = null;
  mockTokenClientErrorCallback = null;
  mockRequestAccessTokenCalls = [];
  mockTokenClient.requestAccessToken.mockClear();

  // Re-apply mocks after module reset
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });

  globalThis.fetch = mockFetch;

  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'script') return createMockScriptElement();
    return Object.getPrototypeOf(document).createElement.call(document, tagName);
  });

  vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
    if ((node as HTMLScriptElement).src?.includes('accounts.google.com')) {
      scriptsAppended.push(node as HTMLScriptElement);
    }
    return node;
  });

  vi.spyOn(document, 'querySelector').mockReturnValue(null);
}

/**
 * Get a fresh googleAuth singleton instance for testing.
 * We use vi.resetModules() to clear the module cache, which forces
 * the module to re-execute and create a new singleton instance.
 */
async function createFreshAuthService() {
  resetModuleAndMocks();

  // Mock process.env
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');

  // Import and return the singleton
  const { googleAuth } = await import('@/lib/sync/googleAuth');
  return googleAuth;
}

/**
 * Type definition for the googleAuth service
 */
type GoogleAuthService = Awaited<ReturnType<typeof createFreshAuthService>>;

// Note: Helper functions have been removed due to timing issues with async mocks.
// All tests should use the inline patterns documented below.
//
// For initialization:
//   const initPromise = auth.initialize();
//   loadGIS();
//   await initPromise;
//
// For sign in:
//   const signInPromise = auth.signIn();
//   await Promise.resolve();
//   // ... simulate callback ...
//   await signInPromise;
//
// For getAccessToken:
//   const tokenPromise = auth.getAccessToken();
//   await Promise.resolve();
//   // ... simulate callback ...
//   await tokenPromise;

// =============================================================================
// INITIALIZATION TESTS (GA-001 to GA-007)
// =============================================================================

describe('GoogleAuth - Initialization', () => {
  it('GA-001: initialize() should load GIS script and create tokenClient', async () => {
    const auth = await createFreshAuthService();

    // Start initialization (don't await yet)
    const initPromise = auth.initialize();

    // Simulate GIS loading
    loadGIS();

    await initPromise;

    // Verify script was appended
    expect(scriptsAppended.length).toBe(1);
    expect(scriptsAppended[0].src).toBe('https://accounts.google.com/gsi/client');

    // Verify tokenClient was created
    expect(mockOauth2.initTokenClient).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'test-client-id',
        scope: expect.stringContaining('drive.appdata'),
      })
    );
  });

  it('GA-002: initialize() should not re-initialize if already initialized', async () => {
    const auth = await createFreshAuthService();

    // First init
    const initPromise1 = auth.initialize();
    loadGIS();
    await initPromise1;

    // Second init should be no-op
    await auth.initialize();

    // initTokenClient should only be called once
    expect(mockOauth2.initTokenClient).toHaveBeenCalledTimes(1);
  });

  it('GA-003: initialize() should only initialize once for concurrent calls', async () => {
    const auth = await createFreshAuthService();

    // Start multiple concurrent initializations
    const promise1 = auth.initialize();
    const promise2 = auth.initialize();
    const promise3 = auth.initialize();

    // Note: Due to how async functions work, each call returns a new Promise wrapper,
    // but they all resolve when the SAME internal initPromise resolves.
    // The important thing is that initTokenClient is only called once.

    loadGIS();
    await Promise.all([promise1, promise2, promise3]);

    // Should only init once - this is the key behavior we're testing
    expect(mockOauth2.initTokenClient).toHaveBeenCalledTimes(1);
  });

  it('GA-004: getClientId() should throw if NEXT_PUBLIC_GOOGLE_CLIENT_ID missing', async () => {
    resetModuleAndMocks();

    // Set EMPTY client ID (the key difference from createFreshAuthService)
    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', '');

    const { googleAuth: auth } = await import('@/lib/sync/googleAuth');

    const initPromise = auth.initialize();
    loadGIS();

    await expect(initPromise).rejects.toThrow('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured');
  });

  it('GA-005: loadGISScript() should resolve immediately if window.google.accounts.oauth2 exists', async () => {
    resetModuleAndMocks();

    // Pre-load GIS BEFORE importing the module
    (globalThis as unknown as { google: typeof mockGoogle }).google = mockGoogle;
    (window as unknown as { google: typeof mockGoogle }).google = mockGoogle;

    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');

    const { googleAuth: auth } = await import('@/lib/sync/googleAuth');
    await auth.initialize();

    // No script should be appended since GIS is already loaded
    expect(scriptsAppended.length).toBe(0);
    expect(mockOauth2.initTokenClient).toHaveBeenCalled();
  });

  it('GA-006: loadGISScript() should wait for existing script if already in DOM', async () => {
    resetModuleAndMocks();

    // Mock that script exists but hasn't loaded yet
    const existingScript = {
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'load') {
          // Simulate load event after a tick
          setTimeout(() => {
            (globalThis as unknown as { google: typeof mockGoogle }).google = mockGoogle;
            (window as unknown as { google: typeof mockGoogle }).google = mockGoogle;
            handler();
          }, 0);
        }
      }),
    };

    // Return the existing script for querySelector (override the default mock)
    vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
      if (selector.includes('accounts.google.com/gsi/client')) {
        return existingScript as unknown as Element;
      }
      return null;
    });
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');

    const { googleAuth: auth } = await import('@/lib/sync/googleAuth');
    await auth.initialize();

    // Should not append new script
    expect(scriptsAppended.length).toBe(0);
    // Should add event listener to existing script
    expect(existingScript.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
  });

  it('GA-007: loadGISScript() should reject if script fails to load', async () => {
    const auth = await createFreshAuthService();

    const initPromise = auth.initialize();

    // Simulate script load failure
    failGISLoad();

    await expect(initPromise).rejects.toThrow('Failed to load Google Identity Services');
  });
});

// =============================================================================
// SIGN IN FLOW TESTS (GA-008 to GA-013)
// =============================================================================

describe('GoogleAuth - Sign In Flow', () => {
  it('GA-008: signIn() should open popup, return access token, store credentials', async () => {
    const auth = await createFreshAuthService();

    // Initialize first
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    // Verify initTokenClient was called and callback was captured
    expect(mockOauth2.initTokenClient).toHaveBeenCalled();
    expect(mockTokenClientCallback).not.toBeNull();

    // Start sign in - but signIn() calls initialize() again which is a no-op since already initialized
    // signIn is async and IMMEDIATELY awaits initialize(), so we need to wait for the next tick
    const signInPromise = auth.signIn();

    // Wait for the microtask queue to flush (signIn awaits initialize internally)
    await Promise.resolve();

    // Verify requestAccessToken was called
    expect(mockTokenClient.requestAccessToken).toHaveBeenCalledWith({ prompt: 'consent' });

    // Simulate successful auth
    simulateTokenSuccess('my-access-token', 3600);

    const token = await signInPromise;

    expect(token).toBe('my-access-token');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.ACCESS_TOKEN,
      'my-access-token'
    );
  });

  it('GA-009: signIn() should reject when user cancels/closes popup', async () => {
    const auth = await createFreshAuthService();

    // Initialize (same pattern as GA-008)
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    // Verify error callback was captured
    expect(mockTokenClientErrorCallback).not.toBeNull();

    // Start sign in (same pattern as GA-008)
    const signInPromise = auth.signIn();
    await Promise.resolve();

    // Simulate user closing popup
    simulateAuthError('popup_closed', 'Popup was closed by user');

    await expect(signInPromise).rejects.toThrow('Popup was closed by user');
  });

  it('GA-010: signIn() should reject with error description from Google', async () => {
    const auth = await createFreshAuthService();
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    const signInPromise = auth.signIn();
    await Promise.resolve();

    // Simulate Google returning an error
    simulateTokenError('access_denied', 'The user denied access');

    await expect(signInPromise).rejects.toThrow('The user denied access');
  });

  it('GA-011: signIn() should store token with correct expiry calculation', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const auth = await createFreshAuthService();
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    const signInPromise = auth.signIn();
    await Promise.resolve();
    simulateTokenSuccess('token-123', 7200); // 2 hours

    await signInPromise;

    // Expiry should be now + 7200 seconds
    const expectedExpiry = now + 7200 * 1000;
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.TOKEN_EXPIRY,
      expectedExpiry.toString()
    );
  });

  it('GA-012: signIn() should fetch user info after successful auth', async () => {
    const auth = await createFreshAuthService();
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    const signInPromise = auth.signIn();
    await Promise.resolve();
    simulateTokenSuccess('token-for-userinfo');

    await signInPromise;

    // Give time for async fetchUserInfo
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer token-for-userinfo',
          },
        })
      );
    });
  });

  it('GA-013: signIn() should auto-initialize if not already initialized', async () => {
    const auth = await createFreshAuthService();

    // Don't call initialize() explicitly
    // signIn() internally calls initialize() then awaits it before continuing

    // Start signIn - it will call initialize() internally
    const signInPromise = auth.signIn();

    // Wait for the script element to be created
    // signIn() does: await this.initialize() which does:
    //   this.initPromise = this._doInitialize() which does:
    //     await this.loadGISScript() which creates the script element synchronously
    // We need to give the Promise executor time to run
    await new Promise((r) => setTimeout(r, 0));

    // Now load GIS
    loadGIS();

    // Wait for initialization to complete
    await new Promise((r) => setTimeout(r, 0));

    // Now complete the sign in
    simulateTokenSuccess();

    await signInPromise;

    expect(mockOauth2.initTokenClient).toHaveBeenCalled();
  });
});

// =============================================================================
// SIGN OUT TESTS (GA-014 to GA-016)
// =============================================================================

describe('GoogleAuth - Sign Out', () => {
  it('GA-014: signOut() should revoke token and clear all stored credentials', async () => {
    const auth = await createFreshAuthService();

    // Setup: initialize and have a stored token
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    // Store a token
    mockStorage.set(STORAGE_KEYS.ACCESS_TOKEN, 'token-to-revoke');
    mockStorage.set(STORAGE_KEYS.TOKEN_EXPIRY, (Date.now() + 3600000).toString());
    mockStorage.set(STORAGE_KEYS.USER_EMAIL, 'user@test.com');
    mockStorage.set(STORAGE_KEYS.USER_ID, 'user-123');

    await auth.signOut();

    // Should have called revoke
    expect(mockOauth2.revoke).toHaveBeenCalledWith('token-to-revoke', expect.any(Function));

    // Should have cleared storage
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.TOKEN_EXPIRY);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_EMAIL);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_ID);
  });

  it('GA-015: signOut() without token should just clear credentials (no revoke)', async () => {
    const auth = await createFreshAuthService();

    // Initialize but don't store any token
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    await auth.signOut();

    // Should NOT have called revoke (no token)
    expect(mockOauth2.revoke).not.toHaveBeenCalled();

    // Should still clear storage
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
  });

  it('GA-016: signOut() should clear all 4 storage keys', async () => {
    const auth = await createFreshAuthService();

    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    // Store all keys
    mockStorage.set(STORAGE_KEYS.ACCESS_TOKEN, 'token');
    mockStorage.set(STORAGE_KEYS.TOKEN_EXPIRY, '123');
    mockStorage.set(STORAGE_KEYS.USER_EMAIL, 'email');
    mockStorage.set(STORAGE_KEYS.USER_ID, 'id');

    await auth.signOut();

    // Verify all 4 keys were removed
    expect(mockLocalStorage.removeItem).toHaveBeenCalledTimes(4);
    expect(mockStorage.has(STORAGE_KEYS.ACCESS_TOKEN)).toBe(false);
    expect(mockStorage.has(STORAGE_KEYS.TOKEN_EXPIRY)).toBe(false);
    expect(mockStorage.has(STORAGE_KEYS.USER_EMAIL)).toBe(false);
    expect(mockStorage.has(STORAGE_KEYS.USER_ID)).toBe(false);
  });
});

// =============================================================================
// TOKEN MANAGEMENT TESTS (GA-017 to GA-021)
// =============================================================================

describe('GoogleAuth - Token Management', () => {
  it('GA-017: getStoredToken() should return token if not expired', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const auth = await createFreshAuthService();

    // Store a valid token (expires in 1 hour)
    mockStorage.set(STORAGE_KEYS.ACCESS_TOKEN, 'valid-token');
    mockStorage.set(STORAGE_KEYS.TOKEN_EXPIRY, (now + 3600000).toString());

    const token = auth.getStoredToken();

    expect(token).toBe('valid-token');
  });

  it('GA-018: getStoredToken() should return null if past expiry time', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const auth = await createFreshAuthService();

    // Store an expired token
    mockStorage.set(STORAGE_KEYS.ACCESS_TOKEN, 'expired-token');
    mockStorage.set(STORAGE_KEYS.TOKEN_EXPIRY, (now - 1000).toString()); // 1 second ago

    const token = auth.getStoredToken();

    expect(token).toBeNull();
  });

  it('GA-019: getStoredToken() should return null if within 5 minutes of expiry', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const auth = await createFreshAuthService();

    // Store a token that expires in 4 minutes (within the 5-minute buffer)
    mockStorage.set(STORAGE_KEYS.ACCESS_TOKEN, 'almost-expired-token');
    mockStorage.set(STORAGE_KEYS.TOKEN_EXPIRY, (now + 4 * 60 * 1000).toString());

    const token = auth.getStoredToken();

    expect(token).toBeNull();
  });

  it('GA-020: getStoredToken() should return null if no token in localStorage', async () => {
    const auth = await createFreshAuthService();

    // Don't store any token
    const token = auth.getStoredToken();

    expect(token).toBeNull();
  });

  it('GA-021: storeToken() should store token and expiry in localStorage', async () => {
    const auth = await createFreshAuthService();
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    const signInPromise = auth.signIn();
    await Promise.resolve();
    simulateTokenSuccess('stored-token', 3600);
    await signInPromise;

    expect(mockStorage.get(STORAGE_KEYS.ACCESS_TOKEN)).toBe('stored-token');
    expect(mockStorage.has(STORAGE_KEYS.TOKEN_EXPIRY)).toBe(true);
  });
});

// =============================================================================
// getAccessToken TESTS (GA-022 to GA-026)
// =============================================================================

describe('GoogleAuth - getAccessToken', () => {
  it('GA-022: getAccessToken() should return stored token without re-auth', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const auth = await createFreshAuthService();
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    // Store a valid token
    mockStorage.set(STORAGE_KEYS.ACCESS_TOKEN, 'existing-valid-token');
    mockStorage.set(STORAGE_KEYS.TOKEN_EXPIRY, (now + 3600000).toString());

    const token = await auth.getAccessToken();

    expect(token).toBe('existing-valid-token');
    // Should NOT have requested a new token
    expect(mockTokenClient.requestAccessToken).not.toHaveBeenCalled();
  });

  it('GA-023: getAccessToken() with expired token and userEmail should attempt silent refresh', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const auth = await createFreshAuthService();
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    // Store expired token but with user email (was previously connected)
    mockStorage.set(STORAGE_KEYS.ACCESS_TOKEN, 'expired-token');
    mockStorage.set(STORAGE_KEYS.TOKEN_EXPIRY, (now - 1000).toString());
    mockStorage.set(STORAGE_KEYS.USER_EMAIL, 'user@test.com');

    const accessTokenPromise = auth.getAccessToken();
    await Promise.resolve();

    // Should request with empty prompt (silent)
    expect(mockRequestAccessTokenCalls.length).toBeGreaterThan(0);
    expect(mockRequestAccessTokenCalls[mockRequestAccessTokenCalls.length - 1].prompt).toBe('');

    // Complete the refresh
    simulateTokenSuccess('refreshed-token');
    const token = await accessTokenPromise;

    expect(token).toBe('refreshed-token');
  });

  it('GA-024: getAccessToken() with expired token and no userEmail should prompt with select_account', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const auth = await createFreshAuthService();
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    // No stored token, no user email
    const accessTokenPromise = auth.getAccessToken();
    await Promise.resolve();

    // Should request with 'select_account' prompt
    expect(mockRequestAccessTokenCalls.length).toBeGreaterThan(0);
    expect(mockRequestAccessTokenCalls[mockRequestAccessTokenCalls.length - 1].prompt).toBe(
      'select_account'
    );

    simulateTokenSuccess('new-token');
    await accessTokenPromise;
  });

  it('GA-025: getAccessToken() silent refresh success should return new token', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const auth = await createFreshAuthService();
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    // Expired but has email
    mockStorage.set(STORAGE_KEYS.TOKEN_EXPIRY, (now - 1000).toString());
    mockStorage.set(STORAGE_KEYS.USER_EMAIL, 'user@test.com');

    const accessTokenPromise = auth.getAccessToken();
    await Promise.resolve();
    simulateTokenSuccess('silently-refreshed-token');

    const token = await accessTokenPromise;
    expect(token).toBe('silently-refreshed-token');
  });

  it('GA-026: getAccessToken() silent refresh fails should reject', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const auth = await createFreshAuthService();
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    // Expired but has email
    mockStorage.set(STORAGE_KEYS.TOKEN_EXPIRY, (now - 1000).toString());
    mockStorage.set(STORAGE_KEYS.USER_EMAIL, 'user@test.com');

    const accessTokenPromise = auth.getAccessToken();
    await Promise.resolve();

    // Simulate failure (popup blocked, user signed out of Google, etc.)
    simulateAuthError('popup_failed_to_open', 'Could not open popup');

    await expect(accessTokenPromise).rejects.toThrow('Could not open popup');
  });
});

// =============================================================================
// isSignedIn TESTS (GA-027 to GA-029)
// =============================================================================

describe('GoogleAuth - isSignedIn', () => {
  it('GA-027: isSignedIn() with valid token should return true', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const auth = await createFreshAuthService();

    // Valid token
    mockStorage.set(STORAGE_KEYS.ACCESS_TOKEN, 'valid-token');
    mockStorage.set(STORAGE_KEYS.TOKEN_EXPIRY, (now + 3600000).toString());

    expect(auth.isSignedIn()).toBe(true);
  });

  it('GA-028: isSignedIn() with expired token but has email should return true', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const auth = await createFreshAuthService();

    // Expired token but has user email
    mockStorage.set(STORAGE_KEYS.ACCESS_TOKEN, 'expired');
    mockStorage.set(STORAGE_KEYS.TOKEN_EXPIRY, (now - 1000).toString());
    mockStorage.set(STORAGE_KEYS.USER_EMAIL, 'user@test.com');

    // Should still be "signed in" because we can silently refresh
    expect(auth.isSignedIn()).toBe(true);
  });

  it('GA-029: isSignedIn() with no token and no email should return false', async () => {
    const auth = await createFreshAuthService();

    // Nothing stored
    expect(auth.isSignedIn()).toBe(false);
  });
});

// =============================================================================
// USER INFO TESTS (GA-030 to GA-037)
// =============================================================================

describe('GoogleAuth - User Info', () => {
  it('GA-030: fetchUserInfo() should fetch from Google API and store email/id', async () => {
    const auth = await createFreshAuthService();
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    // Sign in triggers fetchUserInfo
    const signInPromise = auth.signIn();
    await Promise.resolve();
    simulateTokenSuccess('token-for-fetch');
    await signInPromise;

    // Wait for async fetch
    await vi.waitFor(() => {
      expect(mockStorage.get(STORAGE_KEYS.USER_EMAIL)).toBe('test@example.com');
      expect(mockStorage.get(STORAGE_KEYS.USER_ID)).toBe('mock-user-id');
    });
  });

  it('GA-031: fetchUserInfo() API error should not crash signIn (error is caught internally)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const auth = await createFreshAuthService();
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    const signInPromise = auth.signIn();
    await Promise.resolve();
    simulateTokenSuccess('token');

    // signIn should complete successfully even if fetchUserInfo fails
    // because fetchUserInfo is called async with .catch(console.error)
    await signInPromise;

    // Give time for async fetchUserInfo to complete (and fail gracefully)
    await new Promise((r) => setTimeout(r, 10));
  });

  it('GA-032: getUserEmail() should return email from localStorage', async () => {
    const auth = await createFreshAuthService();

    mockStorage.set(STORAGE_KEYS.USER_EMAIL, 'stored@email.com');

    expect(auth.getUserEmail()).toBe('stored@email.com');
  });

  it('GA-033: getUserEmail() should return null if not stored', async () => {
    const auth = await createFreshAuthService();

    expect(auth.getUserEmail()).toBeNull();
  });

  it('GA-034: getUserId() should return user ID from localStorage', async () => {
    const auth = await createFreshAuthService();

    mockStorage.set(STORAGE_KEYS.USER_ID, 'user-id-123');

    expect(auth.getUserId()).toBe('user-id-123');
  });

  it('GA-035: getUserId() should return null if not stored', async () => {
    const auth = await createFreshAuthService();

    expect(auth.getUserId()).toBeNull();
  });

  it('GA-036: getTokenExpiry() should return Date from parsed timestamp', async () => {
    const auth = await createFreshAuthService();

    const timestamp = Date.now() + 3600000;
    mockStorage.set(STORAGE_KEYS.TOKEN_EXPIRY, timestamp.toString());

    const expiry = auth.getTokenExpiry();

    expect(expiry).toBeInstanceOf(Date);
    expect(expiry?.getTime()).toBe(timestamp);
  });

  it('GA-037: getTokenExpiry() should return null if not stored', async () => {
    const auth = await createFreshAuthService();

    expect(auth.getTokenExpiry()).toBeNull();
  });
});

// =============================================================================
// ERROR HANDLING TESTS (GA-038 to GA-040)
// =============================================================================

describe('GoogleAuth - Error Handling', () => {
  it('GA-038: handleTokenResponse() with error should reject with error_description', async () => {
    const auth = await createFreshAuthService();
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    const signInPromise = auth.signIn();
    await Promise.resolve();

    // Simulate error response with description
    simulateTokenError('invalid_grant', 'Token has been revoked');

    await expect(signInPromise).rejects.toThrow('Token has been revoked');
  });

  it('GA-039: handleAuthError() should reject with formatted error message', async () => {
    const auth = await createFreshAuthService();
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    const signInPromise = auth.signIn();
    await Promise.resolve();

    // Simulate auth error (popup blocked)
    simulateAuthError('popup_blocked', 'Popup was blocked by the browser');

    await expect(signInPromise).rejects.toThrow('Popup was blocked by the browser');
  });

  it('GA-040: handleAuthError() should clear pending state', async () => {
    const auth = await createFreshAuthService();
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    const signInPromise = auth.signIn();
    await Promise.resolve();
    simulateAuthError('test_error', 'Test');

    try {
      await signInPromise;
    } catch {
      // Expected
    }

    // A second signIn should work (pending state was cleared)
    const signInPromise2 = auth.signIn();
    await Promise.resolve();
    simulateTokenSuccess('second-token');

    const token = await signInPromise2;
    expect(token).toBe('second-token');
  });
});

// =============================================================================
// EDGE CASES TESTS (GA-041 to GA-042)
// =============================================================================

describe('GoogleAuth - Edge Cases', () => {
  it('GA-041: Module should export singleton googleAuth instance', async () => {
    // Reset modules to get fresh import
    vi.resetModules();

    // Re-stub env
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');

    const module = await import('@/lib/sync/googleAuth');

    expect(module.googleAuth).toBeDefined();
    expect(typeof module.googleAuth.signIn).toBe('function');
    expect(typeof module.googleAuth.signOut).toBe('function');
    expect(typeof module.googleAuth.getAccessToken).toBe('function');
  });

  it('GA-042: Concurrent signIn calls - second call behavior', async () => {
    /**
     * TODO: Current implementation doesn't handle concurrent signIn gracefully.
     * The second call will overwrite pendingAuthResolve/Reject.
     * This test documents current behavior - should be fixed in future.
     */
    const auth = await createFreshAuthService();
    const initPromise = auth.initialize();
    loadGIS();
    await initPromise;

    // Start first sign in
    const signIn1 = auth.signIn();
    await Promise.resolve(); // Yield to let signIn1 await initialize()

    // Start second sign in while first is pending
    const signIn2 = auth.signIn();
    await Promise.resolve(); // Yield to let signIn2 await initialize()

    // Complete the auth - this will resolve the SECOND promise
    // because it overwrote pendingAuthResolve
    simulateTokenSuccess('token-from-popup');

    // The first promise will never resolve (pending state was overwritten)
    // This is a bug - documenting current behavior
    const token2 = await signIn2;
    expect(token2).toBe('token-from-popup');

    // Note: signIn1 is now orphaned - it will never resolve
    // This should be fixed to either queue or reject the second call
  });
});
