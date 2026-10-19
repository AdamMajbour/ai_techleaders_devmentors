import { HTTP_STATUS } from "@devmentor/core";

import { createRequestScope } from "../../../server/container";

export const dynamic = "force-dynamic";

/** GET /api/users?email=<email> - look up one user by e-mail. */
export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email");
  if (!email) {
    return Response.json({ error: "Query parameter 'email' is required." }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const { cradle } = await createRequestScope();
  const user = await cradle.userRepository.findByEmail(email);
  if (!user) {
    return Response.json({ error: "User not found." }, { status: HTTP_STATUS.NOT_FOUND });
  }

  return Response.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar ?? null,
    createdAt: user.createdAt.toISOString(),
  });
}
