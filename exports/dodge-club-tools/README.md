# Dodge Club Tools — Admin & Scanner

Standalone admin dashboard and door-staff scanner for The Dodge Club.
Both apps proxy all `/api` requests to the deployed API at `https://thedodgeclub.co.uk`.

## Structure

```
apps/
  admin/    — Admin dashboard (runs on port 3000)
  scanner/  — Door scanner PWA (runs on port 3001)
lib/
  api-client/ — Shared API client (auto-generated hooks + types)
```

## Setup in a new Replit

### 1. Create the Replit

- Go to replit.com → Create Repl → choose **Node.js**
- Delete the default files in the editor
- Open the Shell tab

### 2. Upload these files

Drag and drop (or paste) all files from this folder into the Replit file tree,
keeping the same folder structure.

### 3. Install dependencies

In the Shell:
```bash
npm install -g pnpm
pnpm install
```

### 4. Set up workflows

In the Replit workflow panel, create two workflows:

**Admin Dashboard**
```
pnpm --filter @tools/admin run dev
```

**Door Scanner**
```
pnpm --filter @tools/scanner run dev
```

### 5. Run

Start both workflows. The admin will be at port 3000, scanner at port 3001.

## Pointing to a different API

By default both apps point to `https://thedodgeclub.co.uk`.
To use a different API URL, set the `API_URL` environment variable:

```
API_URL=https://your-api-url.com
```

You can set this in Replit's Secrets panel.

## Login

Admin: admin@dodgeclub.com / dodgeball123
