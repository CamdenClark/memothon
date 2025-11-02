import { marked } from "marked";
import { createMCQExtension } from "./markdown";

// Register MCQ extension globally
marked.use({
  extensions: [createMCQExtension()],
});

export { marked };
