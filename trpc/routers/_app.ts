import { applicationsRouter } from "@/modules/applications/server/procedure";
import { eventsRouter } from "@/modules/events/server/procedure";
import { mailRouter } from "@/modules/mail/server/procedure";
import { resumesRouter } from "@/modules/resumes/server/procedure";
import { usersRouter } from "@/modules/users/server/procedure";

import { createTRPCRouter } from "../init";

export const appRouter = createTRPCRouter({
  users: usersRouter,
  resumes: resumesRouter,
  applications: applicationsRouter,
  events: eventsRouter,
  mail: mailRouter,
});

export type AppRouter = typeof appRouter;
