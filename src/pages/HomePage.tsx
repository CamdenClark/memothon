import type { FC } from "hono/jsx";
import { Layout } from "../components/Layout";

interface HomePageProps {
  user?: any;
}

export const HomePage: FC<HomePageProps> = ({ user }) => {
  return (
    <Layout user={user}>
      {user ? (
        <>
          <hgroup>
            <h1>Welcome back, {user.name}!</h1>
            <p>Your memory palace awaits.</p>
          </hgroup>

          {user.openrouterApiKey ? (
            <article>
              <h2>Topic Explainer</h2>
              <p>
                Enter any topic and get a detailed explanation powered by
                Claude.
              </p>
              <form action="/generate-explanation" method="post">
                <label for="topic">What would you like to learn about?</label>
                <input
                  type="text"
                  id="topic"
                  name="topic"
                  required
                  placeholder="e.g., The Byzantine Generals Problem"
                />
                <button type="submit">Generate Explanation</button>
              </form>
            </article>
          ) : (
            <article style="text-align: center;">
              <h2>Get Started</h2>
              <p>
                Connect your OpenRouter account in Settings to start using the
                Topic Explainer.
              </p>
              <a href="/settings" role="button">
                Go to Settings
              </a>
            </article>
          )}
        </>
      ) : (
        <article style="text-align: center;">
          <hgroup>
            <h1>Welcome to Memothon</h1>
            <p>
              Build your memory palace and unlock the power of spaced repetition
              learning.
            </p>
          </hgroup>
          <div>
            <a href="/signup" role="button">
              Get Started
            </a>
            <a href="/signin" role="button" class="secondary">
              Sign In
            </a>
          </div>
        </article>
      )}
    </Layout>
  );
};
