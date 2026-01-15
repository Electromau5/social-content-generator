import prisma from '@/lib/db/prisma';

// Mock user for testing without authentication
// TODO: Re-enable authentication before production
const MOCK_USER = {
  id: 'test-user-001',
  email: 'test@example.com',
  name: 'Test User',
};

// Ensure mock user exists in database
async function ensureMockUserExists() {
  const existingUser = await prisma.user.findUnique({
    where: { id: MOCK_USER.id },
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        id: MOCK_USER.id,
        email: MOCK_USER.email,
        name: MOCK_USER.name,
        passwordHash: 'mock-password-hash',
      },
    });
  }
}

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
  // Ensure mock user exists in database before returning
  await ensureMockUserExists();
  return MOCK_USER;
}
