import type { FC } from 'hono/jsx'

interface LayoutProps {
  title?: string
  user?: any
  children: any
}

export const Layout: FC<LayoutProps> = ({ title = 'Memothon', user, children }) => {
  return (
    <div class="min-h-screen bg-gray-50">
      <nav class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <a href="/" class="text-xl font-bold text-gray-900">
                {title}
              </a>
            </div>
            <div class="flex items-center space-x-4">
              {user ? (
                <div class="flex items-center space-x-4">
                  <span class="text-gray-700">Hello, {user.email}</span>
                  <form method="post" action="/api/auth/sign-out" class="inline">
                    <button type="submit" class="text-red-600 hover:text-red-800">
                      Sign Out
                    </button>
                  </form>
                </div>
              ) : (
                <div class="flex items-center space-x-4">
                  <a href="/signin" class="text-gray-600 hover:text-gray-900">
                    Sign In
                  </a>
                  <a href="/signup" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                    Sign Up
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}