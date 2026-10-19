import { HTTP_STATUS } from "@devmentor/core";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { status: "ok", timestamp: new Date().toISOString() },
    { status: HTTP_STATUS.OK },
  );
}
