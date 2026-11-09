import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { parsePasswordLink, verifyPasswordLink } from "../src/lib/supabase/password-link.ts";

const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const expiry = Math.floor(Date.now() / 1000) + 3600;
const token = (id) => `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: id, exp: expiry })}.test`;
const users = {
  admin: { id: "admin", email: "admin@example.test", password: "admin-password" },
  member: { id: "member", email: "member@example.test", password: null },
};

function fakeAuth({ failUpdate = false } = {}) {
  const accounts = structuredClone(users);
  const calls = [];
  const fetch = async (input, init = {}) => {
    const url = new URL(input);
    const headers = new Headers(init.headers);
    const body = init.body ? JSON.parse(init.body) : {};
    calls.push({ path: url.pathname, method: init.method, body });
    const auth = headers.get("Authorization") ?? "";
    const account = Object.values(accounts).find((user) => auth === `Bearer ${token(user.id)}`);
    const response = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
    if (url.pathname.endsWith("/recover")) return response({});
    if (url.pathname.endsWith("/user") && account) {
      if (init.method === "PUT" && failUpdate) return response({ msg: "Password update failed" }, 400);
      if (init.method === "PUT") account.password = body.password;
      return response({ id: account.id, email: account.email, aud: "authenticated", role: "authenticated" });
    }
    if (url.pathname.endsWith("/token") && url.searchParams.get("grant_type") === "password") {
      const user = Object.values(accounts).find((entry) => entry.email === body.email && entry.password === body.password);
      if (!user) return response({ msg: "Invalid login credentials" }, 400);
      return response({
        access_token: token(user.id), refresh_token: `refresh-${user.id}`, token_type: "bearer",
        expires_in: 3600, user: { id: user.id, email: user.email, aud: "authenticated", role: "authenticated" },
      });
    }
    return response({ msg: "Invalid token" }, 401);
  };
  const client = () => createClient("https://example.test", "publishable-test-key", {
    global: { fetch },
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return { client, accounts, calls };
}

test("only complete invite and recovery fragments are accepted", () => {
  for (const type of ["invite", "recovery"]) {
    assert.deepEqual(parsePasswordLink(`#type=${type}&access_token=a&refresh_token=r`, ""), {
      tokens: { access_token: "a", refresh_token: "r" },
    });
  }
  for (const fragment of ["", "#access_token=a", "#type=signup&access_token=a&refresh_token=r", "#error=access_denied"]) {
    assert.ok(parsePasswordLink(fragment, "").error);
  }
  assert.ok(parsePasswordLink("", "?code=not-a-verified-session").error);
});

test("invite verifies member separately, updates password, and allows password login", async () => {
  const { client, accounts } = fakeAuth();
  const admin = client();
  const setup = client();
  const login = client();
  await admin.auth.setSession({ access_token: token("admin"), refresh_token: "refresh-admin" });
  const link = parsePasswordLink(`#type=invite&access_token=${token("member")}&refresh_token=refresh-member`, "");
  const verified = await verifyPasswordLink(setup.auth, link.tokens);
  assert.equal(verified.email, users.member.email);
  assert.equal((await admin.auth.getSession()).data.session.user.id, "admin");
  assert.equal((await setup.auth.updateUser({ password: "new-password" })).error, null);
  assert.equal(accounts.admin.password, "admin-password");
  assert.equal(accounts.member.password, "new-password");
  assert.equal((await login.auth.signInWithPassword({ email: users.member.email, password: "new-password" })).data.user.id, "member");
  assert.ok((await login.auth.signInWithPassword({ email: users.member.email, password: "wrong-password" })).error);
});

test("recovery requests a link, sets a password, and allows a new login", async () => {
  const { client, calls } = fakeAuth();
  const recovery = client();
  assert.equal((await recovery.auth.resetPasswordForEmail(users.member.email, {
    redirectTo: "https://app.example.test/auth/set-password",
  })).error, null);
  assert.ok(calls.some((call) => call.path.endsWith("/recover") && call.body.email === users.member.email));
  const link = parsePasswordLink(`#type=recovery&access_token=${token("member")}&refresh_token=refresh-member`, "");
  assert.equal((await verifyPasswordLink(recovery.auth, link.tokens)).email, users.member.email);
  assert.equal((await recovery.auth.updateUser({ password: "recovered-password" })).error, null);
  const login = client();
  assert.equal((await login.auth.signInWithPassword({ email: users.member.email, password: "recovered-password" })).data.user.id, "member");
});

test("verification errors do not fall back to another existing session", async () => {
  const { client } = fakeAuth();
  const admin = client();
  const setup = client();
  await admin.auth.setSession({ access_token: token("admin"), refresh_token: "refresh-admin" });
  await assert.rejects(verifyPasswordLink(setup.auth, {
    access_token: token("unknown"), refresh_token: "invalid",
  }));
  assert.equal((await admin.auth.getSession()).data.session.user.id, "admin");
  assert.equal((await setup.auth.getSession()).data.session, null);
});

test("a failed password update does not change the password", async () => {
  const { client, accounts } = fakeAuth({ failUpdate: true });
  const setup = client();
  const link = parsePasswordLink(`#type=invite&access_token=${token("member")}&refresh_token=refresh-member`, "");
  await verifyPasswordLink(setup.auth, link.tokens);
  assert.ok((await setup.auth.updateUser({ password: "new-password" })).error);
  assert.equal(accounts.member.password, null);
});
