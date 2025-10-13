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
            <div class="bg-gray-50 rounded-lg p-6">
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