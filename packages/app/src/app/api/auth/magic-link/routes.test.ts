/** @jest-environment node */
import type { Cradle } from "@devmentor/core/server";
import { UnauthorizedError } from "@devmentor/core";
import { resetEnvCache } from "../../../../../../core/src/config/env";

const mockMagicLinkRequest = jest.fn<Promise<void>, [string, string]>(async () => undefined);
const mockMagicLinkConsume = jest.fn<Promise<string | null>, [string]>(async () => "ada@example.com");
const mockRegister = jest.fn(async () => ({
  id: "user-1",
  email: "ada@example.com",
  name: "Ada",
  avatar: null,
  createdAt: "2026-11-05T12:00:00.000Z",
}));
const mockSignInWithMagicLink = jest.fn(async () => ({
  id: "user-1",
  email: "ada@example.com",
  name: "Ada",
  avatar: null,
  createdAt: "2026-11-05T12:00:00.000Z",
}));
const mockCradle = {
  magicLinkService: { request: mockMagicLinkRequest, consume: mockMagicLinkConsume },
  authService: { register: mockRegister, signInWithMagicLink: mockSignInWithMagicLink },
} as unknown as Cradle;
const mockWithScope = jest.fn(async (fn: (cradle: Cradle) => Promise<unknown>) => fn(mockCradle));

jest.mock("@devmentor/core/server", () => ({
  ...jest.requireActual("@devmentor/core/server"),
  withScope: (fn: (cradle: Cradle) => Promise<unknown>) => mockWithScope(fn),
}));

import { POST as consumeMagicLink } from "./consume/route";
import { POST as requestMagicLink } from "./request/route";
import { POST as register } from "../register/route";

const SECRET = "m".repeat(48);
let nextClient = 1;

function post(
  path: string,
  body: unknown,
  options: { client?: string; csrf?: boolean } = {},
): Request {
  return new Request(`http://localhost/api/auth/${path}`, {
    method: "POST",
    headers: {
      ...(options.csrf === false ? {} : { "x-requested-with": "devmentor" }),
      origin: "http://localhost",
      host: "localhost",
      "x-forwarded-for": options.client ?? `test-client-${nextClient++}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const json = (response: Response) => response.json();

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
  process.env.PUBLIC_SIGNUP = "true";
  process.env.APP_BASE_URL = "https://app.devmentor.example";
  resetEnvCache();
  mockMagicLinkRequest.mockClear();
  mockMagicLinkConsume.mockReset().mockResolvedValue("ada@example.com");
  mockRegister.mockClear();
  mockSignInWithMagicLink.mockClear();
  mockWithScope.mockClear().mockImplementation(async (fn) => fn(mockCradle));
});

describe("POST /api/auth/magic-link/request", () => {
  it("returns an identical generic response for invited and uninvited addresses", async () => {
    const invited = await requestMagicLink(post("magic-link/request", { email: " Ada@Example.COM " }), undefined);
    const uninvited = await requestMagicLink(post("magic-link/request", { email: "nobody@example.com" }), undefined);

    expect(invited.status).toBe(200);
    expect(uninvited.status).toBe(invited.status);
    expect(await json(invited)).toEqual({ ok: true, data: { sent: true } });
    expect(await json(uninvited)).toEqual({ ok: true, data: { sent: true } });
    expect(mockMagicLinkRequest).toHaveBeenNthCalledWith(1, "ada@example.com", "https://app.devmentor.example");
    expect(mockMagicLinkRequest).toHaveBeenNthCalledWith(2, "nobody@example.com", "https://app.devmentor.example");
  });

  it("uses APP_BASE_URL rather than the incoming Host to build mailed links", async () => {
    const response = await requestMagicLink(
      new Request("http://internal-host/api/auth/magic-link/request", {
        method: "POST",
        headers: {
          "x-requested-with": "devmentor",
          origin: "https://attacker.example",
          host: "attacker.example",
          "x-forwarded-for": `spoofed-host-${nextClient++}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: "ada@example.com" }),
      }),
      undefined,
    );

    expect(response.status).toBe(200);
    expect(mockMagicLinkRequest).toHaveBeenCalledWith(
      "ada@example.com",
      "https://app.devmentor.example",
    );
  });

  it("fails explicitly when APP_BASE_URL is missing or invalid", async () => {
    delete process.env.APP_BASE_URL;
    resetEnvCache();
    const missing = await requestMagicLink(post("magic-link/request", { email: "ada@example.com" }), undefined);
    expect(missing.status).toBe(500);
    expect(mockWithScope).not.toHaveBeenCalled();

    process.env.APP_BASE_URL = "ftp://attacker.example";
    resetEnvCache();
    const invalid = await requestMagicLink(post("magic-link/request", { email: "ada@example.com" }), undefined);
    expect(invalid.status).toBe(500);
    expect(mockWithScope).not.toHaveBeenCalled();
  });

  it("preserves CSRF and input validation errors", async () => {
    expect((await requestMagicLink(post("magic-link/request", { email: "a" }, { csrf: false }), undefined)).status).toBe(403);
    expect((await requestMagicLink(post("magic-link/request", { email: "not-an-email" }), undefined)).status).toBe(400);
    expect(mockMagicLinkRequest).not.toHaveBeenCalled();
  });

  it("limits attempts by client and normalized email", async () => {
    const client = `request-limiter-${nextClient++}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      expect(
        (await requestMagicLink(post("magic-link/request", { email: "Ada@Example.COM" }, { client }), undefined)).status,
      ).toBe(200);
    }

    expect(
      (
        await requestMagicLink(
          post("magic-link/request", { email: " ada@example.com " }, { client }),
          undefined,
        )
      ).status,
    ).toBe(429);
    expect(mockMagicLinkRequest).toHaveBeenCalledTimes(5);

    expect(
      (await requestMagicLink(post("magic-link/request", { email: "other@example.com" }, { client }), undefined)).status,
    ).toBe(200);
  });
});

describe("POST /api/auth/magic-link/consume", () => {
  it("signs in the invited user, returns a session cookie, and uses the same generic 401 for invalid tokens", async () => {
    const response = await consumeMagicLink(post("magic-link/consume", { token: "A".repeat(43) }), undefined);

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("devmentor_session=");
    expect(await json(response)).toEqual({
      ok: true,
      data: { user: expect.objectContaining({ id: "user-1", email: "ada@example.com" }) },
    });
    expect(mockMagicLinkConsume).toHaveBeenCalledWith("A".repeat(43));
    expect(mockSignInWithMagicLink).toHaveBeenCalledWith("ada@example.com");

    mockMagicLinkConsume.mockResolvedValueOnce(null);
    const invalid = await consumeMagicLink(post("magic-link/consume", { token: "not-a-token" }), undefined);
    expect(invalid.status).toBe(401);
    expect(await json(invalid)).toMatchObject({
      ok: false,
      error: { code: "unauthorized", message: "Invalid or expired link." },
    });

    mockSignInWithMagicLink.mockRejectedValueOnce(new UnauthorizedError("Invalid or expired link."));
    const revoked = await consumeMagicLink(post("magic-link/consume", { token: "A".repeat(43) }), undefined);
    expect(revoked.status).toBe(401);
    expect(await json(revoked)).toMatchObject({
      ok: false,
      error: { code: "unauthorized", message: "Invalid or expired link." },
    });
  });

  it("preserves CSRF and request-shape validation", async () => {
    expect((await consumeMagicLink(post("magic-link/consume", { token: "x" }, { csrf: false }), undefined)).status).toBe(403);
    expect((await consumeMagicLink(post("magic-link/consume", {}), undefined)).status).toBe(400);
    expect(mockMagicLinkConsume).not.toHaveBeenCalled();
  });

  it("rate-limits invalid consume attempts by client", async () => {
    const client = `consume-limiter-${nextClient++}`;
    mockMagicLinkConsume.mockResolvedValue(null);
    for (let attempt = 0; attempt < 10; attempt++) {
      expect((await consumeMagicLink(post("magic-link/consume", { token: "invalid" }, { client }), undefined)).status).toBe(401);
    }
    expect((await consumeMagicLink(post("magic-link/consume", { token: "invalid" }, { client }), undefined)).status).toBe(429);
  });
});

describe("POST /api/auth/register PUBLIC_SIGNUP guard", () => {
  it("blocks registration when PUBLIC_SIGNUP is false", async () => {
    process.env.PUBLIC_SIGNUP = "false";
    resetEnvCache();

    const response = await register(
      post("register", { email: "ada@example.com", name: "Ada", password: "correct horse battery" }),
      undefined,
    );

    expect(response.status).toBe(403);
    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockWithScope).not.toHaveBeenCalled();
  });

  it("keeps registration available when PUBLIC_SIGNUP is explicitly true", async () => {
    process.env.PUBLIC_SIGNUP = "true";
    resetEnvCache();

    const response = await register(
      post("register", { email: "ada@example.com", name: "Ada", password: "correct horse battery" }),
      undefined,
    );

    expect(response.status).toBe(201);
    expect(mockRegister).toHaveBeenCalledWith({
      email: "ada@example.com",
      name: "Ada",
      password: "correct horse battery",
    });
  });

  it("keeps registration available by default", async () => {
    delete process.env.PUBLIC_SIGNUP;
    resetEnvCache();

    const response = await register(
      post("register", { email: "ada@example.com", name: "Ada", password: "correct horse battery" }),
      undefined,
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toContain("devmentor_session=");
    expect(mockRegister).toHaveBeenCalledWith({
      email: "ada@example.com",
      name: "Ada",
      password: "correct horse battery",
    });
  });
});
