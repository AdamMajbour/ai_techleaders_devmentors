import { apiHandler } from "@devmentor/core/server";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async () => ({ status: "ok", timestamp: new Date().toISOString() }));
