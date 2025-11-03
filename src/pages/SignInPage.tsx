import type { FC } from "hono/jsx";
import { Layout } from "../components/Layout";

export const SignInPage: FC = () => {
  return (
    <Layout>
      <article style="max-width: 500px; margin: 0 auto;">
        <hgroup>
          <h1>Sign in to your account</h1>
          <p>
            Or <a href="/signup">create a new account</a>
          </p>
        </hgroup>
        <form action="/signin" method="post">
          <label for="email-address">Email address</label>
          <input
            id="email-address"
            name="email"
            type="email"
            autocomplete="email"
            required
            placeholder="Email address"
          />

          <label for="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="Password"
          />

          <button type="submit">Sign in</button>
        </form>
      </article>
    </Layout>
  );
};
