import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import openrouter from './openrouter'
import * as oauth from '../lib/oauth'
import * as db from '../db'
import { setCookie, getCookie } from 'hono/cookie'

// Mock dependencies
vi.mock('../lib/oauth')
vi.mock('../db')
vi.mock('hono/cookie')
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}))

describe('OpenRouter OAuth Routes', () => {
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()

    // Create a test app with the openrouter routes
    app = new Hono()

    // Add middleware to simulate authentication
    app.use('*', async (c, next) => {
      c.set('auth', {} as any)
      c.set('user', null)
      c.set('session', null)
      await next()
    })

    // Mount the openrouter routes
    app.route('/oauth/openrouter', openrouter)
  })

  describe('GET /oauth/openrouter/initiate', () => {
    it('should redirect unauthenticated users to signin', async () => {
      const res = await app.request('/oauth/openrouter/initiate')

      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('/signin?error=not_authenticated')
    })

    it('should generate PKCE parameters and redirect authenticated users to OpenRouter', async () => {
      const mockVerifier = 'mock-verifier-123'
      const mockChallenge = 'mock-challenge-456'

      vi.mocked(oauth.generateCodeVerifier).mockReturnValue(mockVerifier)
      vi.mocked(oauth.generateCodeChallenge).mockResolvedValue(mockChallenge)

      // Create app with authenticated user
      const authApp = new Hono()
      authApp.use('*', async (c, next) => {
        c.set('user', { id: 'user-123', email: 'test@example.com' })
        await next()
      })
      authApp.route('/oauth/openrouter', openrouter)

      // Mock environment variables
      const res = await authApp.request('/oauth/openrouter/initiate', {
        headers: {
          host: 'localhost:5173',
        },
      }, {
        BETTER_AUTH_URL: 'http://localhost:5173',
      } as any)

      expect(res.status).toBe(302)

      const location = res.headers.get('location')
      expect(location).toContain('https://openrouter.ai/auth')
      expect(location).toContain(`code_challenge=${mockChallenge}`)
      expect(location).toContain('code_challenge_method=S256')

      // Check that callback_url is present (will be URL-encoded)
      const url = new URL(location!)
      expect(url.searchParams.get('callback_url')).toBe('http://localhost:5173/oauth/openrouter/callback')

      expect(oauth.generateCodeVerifier).toHaveBeenCalledTimes(1)
      expect(oauth.generateCodeChallenge).toHaveBeenCalledWith(mockVerifier)
      expect(setCookie).toHaveBeenCalledWith(
        expect.anything(),
        'openrouter_verifier',
        mockVerifier,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'Lax',
          maxAge: 600,
          path: '/',
        })
      )
    })
  })

  describe('GET /oauth/openrouter/callback', () => {
    it('should redirect unauthenticated users to signin', async () => {
      const res = await app.request('/oauth/openrouter/callback?code=test-code')

      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('/signin?error=not_authenticated')
    })

    it('should redirect when code parameter is missing', async () => {
      const authApp = new Hono()
      authApp.use('*', async (c, next) => {
        c.set('user', { id: 'user-123', email: 'test@example.com' })
        await next()
      })
      authApp.route('/oauth/openrouter', openrouter)

      const res = await authApp.request('/oauth/openrouter/callback')

      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('/?error=missing_code')
    })

    it('should redirect when verifier cookie is missing', async () => {
      vi.mocked(getCookie).mockReturnValue(undefined)

      const authApp = new Hono()
      authApp.use('*', async (c, next) => {
        c.set('user', { id: 'user-123', email: 'test@example.com' })
        await next()
      })
      authApp.route('/oauth/openrouter', openrouter)

      const res = await authApp.request('/oauth/openrouter/callback?code=test-code')

      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('/?error=missing_verifier')
    })

    it('should handle failed API key exchange', async () => {
      vi.mocked(getCookie).mockReturnValue('mock-verifier')

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('{"error":"invalid_code"}'),
      })

      const authApp = new Hono()
      authApp.use('*', async (c, next) => {
        c.set('user', { id: 'user-123', email: 'test@example.com' })
        await next()
      })
      authApp.route('/oauth/openrouter', openrouter)

      const res = await authApp.request('/oauth/openrouter/callback?code=test-code', {}, {
        DATABASE_URL: 'postgresql://test',
      } as any)

      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('/?error=key_exchange_failed')
    })

    it('should successfully exchange code for API key and store it', async () => {
      const mockCode = 'test-code'
      const mockVerifier = 'mock-verifier'
      const mockApiKey = 'sk-or-v1-mock-key-123'
      const mockUserId = 'user-123'

      vi.mocked(getCookie).mockReturnValue(mockVerifier)

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ key: mockApiKey }),
      })

      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      }

      vi.mocked(db.createDb).mockReturnValue(mockDb as any)

      const authApp = new Hono()
      authApp.use('*', async (c, next) => {
        c.set('user', { id: mockUserId, email: 'test@example.com' })
        await next()
      })
      authApp.route('/oauth/openrouter', openrouter)

      const res = await authApp.request(
        `/oauth/openrouter/callback?code=${mockCode}`,
        {},
        {
          DATABASE_URL: 'postgresql://test',
        } as any
      )

      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('/?success=openrouter_connected')

      // Verify fetch was called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/auth/keys',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: mockCode,
            code_verifier: mockVerifier,
            code_challenge_method: 'S256',
          }),
        })
      )

      // Verify database update was called
      expect(db.createDb).toHaveBeenCalledWith('postgresql://test')
      expect(mockDb.set).toHaveBeenCalledWith({ openrouterApiKey: mockApiKey })

      // Verify verifier cookie was cleared
      expect(setCookie).toHaveBeenCalledWith(
        expect.anything(),
        'openrouter_verifier',
        '',
        expect.objectContaining({
          maxAge: 0,
          path: '/',
        })
      )
    })

    it('should handle unexpected errors during callback', async () => {
      vi.mocked(getCookie).mockReturnValue('mock-verifier')

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const authApp = new Hono()
      authApp.use('*', async (c, next) => {
        c.set('user', { id: 'user-123', email: 'test@example.com' })
        await next()
      })
      authApp.route('/oauth/openrouter', openrouter)

      const res = await authApp.request(
        '/oauth/openrouter/callback?code=test-code',
        {},
        {
          DATABASE_URL: 'postgresql://test',
        } as any
      )

      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('/?error=callback_failed')
    })
  })
})
