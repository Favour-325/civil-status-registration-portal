import { fetchAuthSession } from "aws-amplify/auth";
import type { ApplicationRecord, ApplicationStatus, ApplicationType } from "./types";

// The configured value carries a trailing slash; stripping it here keeps every
// call site from having to think about it.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

/** Thrown for any non-2xx response. `isAuthError` means the officer must sign in again. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }
}

/**
 * Both update Lambdas and get_applications authorise on the `iss` claim matching
 * ADMIN_USER_POOL_ID, so the ID token is the one to send.
 */
async function getIdToken(): Promise<string> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) {
    throw new ApiError("No active session", 401);
  }
  return token;
}

/**
 * The signed-in officer, read from the ID token's claims. Which claims exist
 * depends on how the Cognito user was created, so fall back through them rather
 * than assuming `name` is populated.
 */
export async function getOfficerIdentity(): Promise<{ name: string; email?: string }> {
  const session = await fetchAuthSession();
  const payload = session.tokens?.idToken?.payload;
  if (!payload) {
    throw new ApiError("No active session", 401);
  }
  const email = typeof payload.email === "string" ? payload.email : undefined;
  const name =
    (typeof payload.name === "string" && payload.name) ||
    email ||
    (typeof payload["cognito:username"] === "string" ? payload["cognito:username"] : "") ||
    "Officer";
  return { name, email };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getIdToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.message || `Request failed (${res.status})`, res.status);
  }

  return res.json() as Promise<T>;
}

export async function listApplications(
  type: ApplicationType,
  status?: ApplicationStatus,
): Promise<ApplicationRecord[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const body = await request<{ count: number; applications: ApplicationRecord[] }>(
    `/${type}${query}`,
  );
  // The Lambda stores the type on the item, but older records may predate it.
  return body.applications.map((a) => ({ ...a, type: a.type ?? type }));
}

/**
 * Mint a short-lived presigned URL for the supporting document. The bucket is
 * private, so this is the only way an officer can read it.
 */
export async function getDocumentUrl(documentKey: string): Promise<string> {
  const body = await request<{ downloadUrl: string }>(
    `/documents?key=${encodeURIComponent(documentKey)}`,
  );
  return body.downloadUrl;
}

export async function updateApplication(
  type: ApplicationType,
  input: {
    // citizenId is the table's partition key and isn't in the officer's token,
    // so it has to be echoed back from the listing.
    citizenId: string;
    applicationId: string;
    status: Extract<ApplicationStatus, "ACCEPTED" | "REJECTED">;
    reason?: string;
  },
): Promise<{ message: string }> {
  return request<{ message: string }>(`/${type}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
