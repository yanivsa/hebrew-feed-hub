# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/8cc846b4-d5e9-4c1f-83f7-c40a8897c6c7

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/8cc846b4-d5e9-4c1f-83f7-c40a8897c6c7) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/8cc846b4-d5e9-4c1f-83f7-c40a8897c6c7) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Local environment variables

Create a `.env.local` file in the project root before running `npm run dev`:

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
VITE_APP_VERSION=v0.3.0
```

You can retrieve the Supabase URL and anon key directly from Lovable:

1. Open your Lovable project → **Settings → Integrations → Supabase**.
2. Copy the URL and anon key into `.env.local`.

> ℹ️ The Supabase project that backs this Lovable app is `ipcqgzxibyswowtputdm` (see `supabase/config.toml`).  
> You can visit [Supabase Studio](https://supabase.com/dashboard/project/ipcqgzxibyswowtputdm/editor) with your Supabase credentials to inspect tables, run SQL, or invite collaborators.  
> All RSS data lives in the `public.rss_sources` table, and the Edge Function `fetch-rss` runs under this project.

### Version badge

Every code change should bump the version that appears on the homepage.  
Update `VITE_APP_VERSION` (or the fallback inside `src/version.ts`) before merging. This keeps the badge in the header in sync with the deployed build and makes it easy to track which revision is live.
