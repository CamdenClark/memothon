import type { FC } from "hono/jsx";
import { Layout } from "../components/Layout";

export const SignUpPage: FC = () => {
  return (
    <Layout title="Sign Up - Memothon">
      <article style="max-width: 500px; margin: 0 auto;">
        <hgroup>
          <h1>Create your account</h1>
          <p>
            Or <a href="/signin">sign in to your existing account</a>
          </p>
        </hgroup>
        <form action="/signup" method="post">
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
            autocomplete="new-password"
            required
            placeholder="Password"
          />

          <button type="submit">Create account</button>
        </form>
      </article>
    </Layout>
  );
};
