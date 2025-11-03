import type { FC } from "hono/jsx";
import { Layout } from "../components/Layout";

interface SettingsPageProps {
  user?: any;
}

export const SettingsPage: FC<SettingsPageProps> = ({ user }) => {
  if (!user) {
    return (
      <Layout user={user}>
        <article style="text-align: center;">
          <h1>Settings</h1>
          <p>Please sign in to access settings.</p>
          <a href="/signin" role="button">
            Sign In
          </a>
        </article>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <h1>Settings</h1>

      <article>
        <h2>Account</h2>
        <form method="post" action="/signout">
          <button type="submit" class="secondary">
            Sign Out
          </button>
        </form>
      </article>

      <article>
        <h2>OpenRouter Integration</h2>
        {user.openrouterApiKey ? (
          <>
            <p>
              ✓ <strong>Connected to OpenRouter</strong>
            </p>
            <p>Your OpenRouter API key is securely stored and ready to use.</p>
            <p>
              <code>{user.openrouterApiKey.substring(0, 12)}...</code>
            </p>
          </>
        ) : (
          <>
            <p>
              ⚠ <strong>Not connected</strong>
            </p>
            <p>
              Connect your OpenRouter account to access AI models for enhanced
              learning features.
            </p>
            <a href="/oauth/openrouter/initiate" role="button">
              Connect OpenRouter Account
            </a>
          </>
        )}
      </article>

      <article>
        <h2>Profile Information</h2>
        <table>
          <tbody>
            <tr>
              <td>
                <strong>User ID</strong>
              </td>
              <td>
                <code>{user.id}</code>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Email</strong>
              </td>
              <td>{user.email}</td>
            </tr>
            <tr>
              <td>
                <strong>Name</strong>
              </td>
              <td>{user.name}</td>
            </tr>
          </tbody>
        </table>
      </article>
    </Layout>
  );
};
