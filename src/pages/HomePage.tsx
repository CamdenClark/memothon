import type { FC } from 'hono/jsx'
import { Layout } from '../components/Layout'

interface HomePageProps {
  user?: any
}

export const HomePage: FC<HomePageProps> = ({ user }) => {
  return (
    <Layout user={user}>
      {user ? (
        <div class="px-4 py-6 sm:px-0">
          <div class="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div class="text-center mb-8">
              <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                ✓ Successfully logged in!
              </div>
              <h1 class="text-3xl font-bold text-gray-900 mb-4">Welcome back, {user.email}!</h1>
              <p class="text-gray-600 mb-6">Your memory palace awaits.</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-6 mb-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-4">Session Info</h2>
              <div class="space-y-2 text-left">
                <div class="flex justify-between">
                  <span class="text-gray-600">User ID:</span>
                  <span class="text-gray-900 font-mono text-sm">{user.id}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Email:</span>
                  <span class="text-gray-900">{user.email}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Name:</span>
                  <span class="text-gray-900">{user.name}</span>
                </div>
              </div>
            </div>
            <div class="bg-white border-2 border-gray-200 rounded-lg p-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-4">OpenRouter Integration</h2>
              {user.openrouterApiKey ? (
                <div class="space-y-4">
                  <div class="flex items-center text-green-600">
                    <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    <span class="font-medium">Connected to OpenRouter</span>
                  </div>
                  <p class="text-gray-600 text-sm">Your OpenRouter API key is securely stored and ready to use.</p>
                  <div class="text-sm text-gray-500">
                    <span class="font-mono bg-gray-100 px-2 py-1 rounded">
                      {user.openrouterApiKey.substring(0, 12)}...
                    </span>
                  </div>
                </div>
              ) : (
                <div class="space-y-4">
                  <div class="flex items-center text-yellow-600">
                    <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                    <span class="font-medium">Not connected</span>
                  </div>
                  <p class="text-gray-600 text-sm">Connect your OpenRouter account to access AI models for enhanced learning features.</p>
                  <a
                    href="/oauth/openrouter/initiate"
                    class="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
                  >
                    Connect OpenRouter Account
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div class="px-4 py-6 sm:px-0">
          <div class="text-center">
            <h1 class="text-4xl font-bold text-gray-900 mb-8">Welcome to Memothon</h1>
            <p class="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Build your memory palace and unlock the power of spaced repetition learning.
            </p>
            <div class="space-x-4">
              <a href="/signup" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md text-lg font-medium">
                Get Started
              </a>
              <a href="/signin" class="border border-gray-300 hover:bg-gray-50 text-gray-700 px-8 py-3 rounded-md text-lg font-medium">
                Sign In
              </a>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}