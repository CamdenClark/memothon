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
          {user.openrouterApiKey ? (
            <article>
              <h2>New topics</h2>
              <p>Enter a new topic to learn</p>
              <form
                id="topic-form"
                method="post"
                onsubmit="event.preventDefault(); const uuid = crypto.randomUUID(); this.action = `/topics/${uuid}/learn`; this.submit();"
              >
                <fieldset role="group">
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    placeholder="e.g., The Byzantine Generals Problem"
                    aria-label="What would you like to learn about?"
                  />
                  <button type="submit">Learn</button>
                </fieldset>
              </form>
            </article>
          ) : null}

          <article>
            <h2>Review topics</h2>
            <p>No topics ready for review yet</p>
          </article>

          {!user.openrouterApiKey && (
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
