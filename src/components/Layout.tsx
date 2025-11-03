import type { FC } from "hono/jsx";

interface LayoutProps {
  user?: any;
  children: any;
}

export const Layout: FC<LayoutProps> = ({ user, children }) => {
  return (
    <html>
      <body>
        <header class="container">
          <nav style="background-color: var(--pico-background-color); border-bottom: 1px solid var(--pico-muted-border-color);">
            <ul>
              <li>
                <strong>
                  <a href="/" style="text-decoration: none;">
                    Memothon
                  </a>
                </strong>
              </li>
            </ul>
            <ul>
              {user ? (
                <>
                  <li>
                    <a href="/settings">Settings</a>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <a
                      href="/signin"
                      role="button"
                      class="secondary outline"
                      style="padding: 0.25rem 0.75rem; font-size: 0.875rem;"
                    >
                      Sign In
                    </a>
                  </li>
                  <li>
                    <a
                      href="/signup"
                      role="button"
                      style="padding: 0.25rem 0.75rem; font-size: 0.875rem;"
                    >
                      Sign Up
                    </a>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </header>
        <main class="container">{children}</main>
      </body>
    </html>
  );
};
