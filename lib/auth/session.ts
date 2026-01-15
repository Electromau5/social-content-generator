// Mock user for testing without authentication
// TODO: Re-enable authentication before production
const MOCK_USER = {
  id: 'test-user-001',
  email: 'test@example.com',
  name: 'Test User',
};

export async function getSession() {
  // Return mock session for testing
  return {
    user: MOCK_USER,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function getCurrentUser() {
  return MOCK_USER;
}

export async function requireAuth() {
  // Always return mock user - no auth required for testing
  return MOCK_USER;
}
