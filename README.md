# OrbInSpire Games

I built this for a tabletop game shop in North Fort Worth. They needed something to track customer store credit balances, run events, and have a public page where people could see what tournaments were coming up. Think Magic: The Gathering, Pokemon, Yu-Gi-Oh!, Warhammer, that kind of thing.

The project isn't active anymore and the shop stopped using it, but I'm keeping the repo up as a portfolio piece.

## How it works

There's a public landing page with an events calendar, store hours, and logos for the game brands they carry. That's what customers see.

Behind that is an admin panel for the staff. Employees look up customers by name or phone number, see their credit balance, and log transactions against it (buy-ins, purchases, adjustments). Managers can create events with game type, format, entry fee, max players. Owners get full control: inviting staff, assigning roles, configuring credit types and store hours. There's also a CSV import for migrating transaction history in bulk.

One of the later features I added was making credit types configurable from the admin UI so the shop owner could add new ones without asking me to push a code change.

## Tech stack

React and TypeScript on Vite, with TanStack Router handling file-based routing. Tailwind CSS and shadcn/ui for the frontend. Convex handles the backend: database, auth, and serverless functions. Deployed on Vercel.

## Running it locally

```bash
npm install
npx convex dev   # starts the Convex backend
npm run dev       # starts the Vite dev server
```

You need a Convex account and a `.env.local` with your `VITE_CONVEX_URL` set.
