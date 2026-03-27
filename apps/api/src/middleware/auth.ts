export type AuthContext = {
  userId: string;
};

export function requireAuth(token: string | undefined): AuthContext {
  if (!token) {
    throw new Error("Unauthorized");
  }

  return { userId: "replace-with-verified-user-id" };
}
