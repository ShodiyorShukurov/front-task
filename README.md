# HAUZ frontend take-home

Email-code sign-in, onboarding, `/profile`, a server-rendered header and log
out, built on TanStack Start and Appwrite. `TASK.md` is the brief, `NOTES.md`
explains the decisions.

## Quick start

Steps 1–5 below, in short:

```bash
npm install
# put your Project ID into appwrite.config.json
npx appwrite login
npm run appwrite:push
cp .env.example .env   # fill in endpoint, project id, API key
npm run dev            # http://localhost:3000
```

Two things that cost me time:

- **Start the dev server after `.env` exists.** The env file is read once at
  startup. A server started earlier fails every Appwrite call ("Something
  went wrong" on sign-in). Restart it.
- **Run only one dev server per checkout.** Two of them rewrite
  `src/routeTree.gen.ts` in turn and reload each other forever.

## Where things are

```
src/server/appwrite.server.ts          Appwrite clients, cookie names; server only
src/server/personal-account.server.ts  calls the Function as the signed-in user
src/server/auth.ts                     getSession, sendCode, verifyCode, signOut
src/server/profile.ts                  createAccount, updateAccount
src/start.ts                           CSRF check on server function calls
src/lib/redirect.ts                    safeRedirect for the ?redirect= param
src/routes/                            sign-in, onboarding, profile, index, root
src/components/Header.tsx              header and log out
```

The original setup notes follow.

---

## What you need

- Node 22 or newer
- A free Appwrite Cloud account at https://cloud.appwrite.io

## Setup

Budget 20 minutes. If you get stuck for longer than that, email us instead of
grinding on it. Setup friction is not what we are testing.

### 1. Install dependencies

```bash
npm install
```

### 2. Create an Appwrite project

In the Appwrite Console, create a new project. From **Overview**, copy the
**Project ID** and the **API Endpoint**. The endpoint is region specific, for
example `https://fra.cloud.appwrite.io/v1`.

Put both into `appwrite.config.json`, replacing `REPLACE_WITH_YOUR_PROJECT_ID`
and the `endpoint` if your region differs.

### 3. Push the database, table and Function

```bash
npx appwrite login
npm run appwrite:push
```

That creates the `main` database, the `personal_accounts` table with its unique
index, and deploys the `personal-account` Function. The first deployment takes a
minute or two while Appwrite builds it.

Confirm it worked: the Function should appear in the Console under **Functions**
with a ready deployment, and its **Execute access** should be `users`.

One warning about that command. `appwrite push table` treats
`appwrite.config.json` as the full picture of your schema and deletes tables in
the project that are not in it. On the fresh project you just made there is
nothing to delete, so it is safe here. Do not run it against a project that has
other tables in it.

### 4. Create an API key

Console, **Overview**, **Integrations**, **API keys**, **Create API key**.

Give it these scopes:

- `sessions.write`
- `users.read`
- `users.write`
- `execution.write`

Copy the secret once. You cannot read it again.

### 5. Fill in your environment

```bash
cp .env.example .env
```

Fill in `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID` and `APPWRITE_API_KEY`.
`.env` is git-ignored. Do not commit it.

### 6. Run it

```bash
npm run dev
```

http://localhost:3000

## What is in here

```
src/                          the app you are building; it is empty on purpose
  router.tsx                  router setup
  routes/__root.tsx           the document shell
  routes/index.tsx            placeholder home page
functions/personal-account/   the Function, already written
appwrite.config.json          database, table and Function definitions
```

Other scripts:

```bash
npm run build       production build
npm run typecheck   tsc --noEmit
npm run appwrite    the Appwrite CLI, scoped to this project's config
```

## The Function

One Appwrite Function with three routes. It is deployed with **Execute access:
users**, which means a signed-in Appwrite user can execute it and a guest
cannot.

| Route | Body | Result |
|---|---|---|
| `GET /personal-account` | | `200` with the account, `404` if the caller has none |
| `POST /personal-account` | `firstName`, `lastName`, `role` | `201` created, `200` if it already exists, `409` if it exists with a different role |
| `PATCH /personal-account` | any of `firstName`, `lastName`, `contactEmail`, `bio` | `200` with the updated account |

`role` is either `property_owner` or `realtor`.

On `PATCH`, a field you leave out keeps its stored value and `null` clears it.
Every route answers `401` when the execution has no signed-in Appwrite user.

Errors come back as `{ "error": "<code>", "message": "...", "issues": [...] }`.
Codes you may see: `unauthorized`, `not_found`, `invalid_request`,
`personal_account_inconsistent`, `internal_error`.

You can read the source under `functions/personal-account/src/`. You may change
it if you need to, but say why in `NOTES.md`.

## Email codes

Appwrite Cloud sends the sign-in codes from its own mail server on the free
plan. Check your spam folder. If nothing arrives after a few minutes, Cloud may
be rate limiting you, so wait and retry rather than clicking send repeatedly.
