
import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  {
    id: "hello-world",
    triggers: { event: "test/hello" },
  },
  async ({ event }) => {
    return {
      message: "Hello from Inngest",
      data: event.data,
    };
  }
);
