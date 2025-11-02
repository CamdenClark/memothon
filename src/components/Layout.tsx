import type { FC } from "hono/jsx";

interface LayoutProps {
  title?: string;
  user?: any;
  children: any;
}

export const Layout: FC<LayoutProps> = ({
  title = "Memothon",
  user,
  children,
}) => {
  return (
    <html>
      <body>
        <header class="container">
          <nav style="background-color: var(--pico-background-color); border-bottom: 1px solid var(--pico-muted-border-color);">
            <ul>
              <li>
                <strong>
                  <a href="/" style="text-decoration: none;">
                    {title}
                  </a>
                </strong>
              </li>
            </ul>
            <ul>
              {user && (
                <>
                  <li>
                    <a href="/">Home</a>
                  </li>
                  <li>
                    <a href="/settings">Settings</a>
                  </li>
                </>
              )}
              {user ? (
                <>
                  <li>
                    <small>{user.name || user.email}</small>
                  </li>
                  <li>
                    <form
                      method="post"
                      action="/signout"
                      style="display: inline;"
                    >
                      <button type="submit" class="secondary outline">
                        Sign Out
                      </button>
                    </form>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <a href="/signin" role="button" class="secondary outline">
                      Sign In
                    </a>
                  </li>
                  <li>
                    <a href="/signup" role="button">
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
