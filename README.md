# Sandiego Collections local development

## Requirements

- Node.js 20.19 or newer
- npm

## First-time setup

Open two terminals from the workspace root and install each app's dependencies:

```powershell
cd backend
npm install
```

Create `backend/.env` with these settings, replacing both secret placeholders with private values:

```dotenv
PORT=5000
CLIENT_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
PUBLIC_API_URL=http://localhost:5000
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters-long
ADMIN_SIGNUP_INVITE=replace-with-a-private-admin-invitation-code
```

Set a unique `JWT_SECRET` of at least 32 characters and a private `ADMIN_SIGNUP_INVITE` before registering administrators. The invitation must be shared privately. The first three invited accounts can register; subsequent attempts are rejected by the API. Never commit `.env` files.

For local development without MongoDB, the backend uses `backend/data/store.json` and stores product photos in `backend/public/uploads/products`. To use MongoDB locally, add `DATABASE_URL` to `backend/.env`; this switches all account, inventory, and order data to MongoDB. If the URI does not specify a database name, also set `MONGODB_DATABASE` to the name of your existing database.

In the second terminal:

```powershell
cd frontend
npm install
```

Optional frontend settings can be created in `frontend/.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
VITE_MERCHANT_WHATSAPP_NUMBER=2348000000000
```

Use the merchant's real WhatsApp number in international digits without `+` or spaces. Leave it unset until confirmed.

## Run both servers

Terminal 1, from the workspace root:

```powershell
cd backend
npm run dev
```

Terminal 2, from the workspace root:

```powershell
cd frontend
npm run dev
```

Open the Vite URL printed in the frontend terminal. The API listens on `http://localhost:5000`; check `http://localhost:5000/api/health` for its health response.

## Database and deployment

For Render, set the backend root directory to `backend`, the build command to `npm ci`, and the start command to `npm start`. Configure these environment variables in Render (not in GitHub):

- `DATABASE_URL`: the private MongoDB connection string. The database must support transactions (MongoDB Atlas/replica set or a sharded cluster).
- `MONGODB_DATABASE`: set this to the existing database name if the connection string does not include it (for example, when it ends in `/`).
- `JWT_SECRET`: a private random secret of at least 32 characters.
- `ADMIN_SIGNUP_INVITE`: a private invitation used to register the first three administrators.
- `CLIENT_ORIGIN`: the exact deployed Vercel origin, such as `https://your-store.vercel.app`.
- `PUBLIC_API_URL`: the public HTTPS URL of the Render API service.
- `NODE_ENV=production`.

The backend stores accounts, products, and orders in separate MongoDB collections and uses transactions to serialize and atomically persist changes. Product images are stored in MongoDB GridFS, so neither the database nor uploaded images depend on Render's ephemeral local filesystem. The first startup creates the required collections and indexes; it does not overwrite existing records. No `STORE_PATH` is needed when `DATABASE_URL` is set. Ensure your MongoDB network access rules allow connections from Render.

For Vercel, set the frontend root directory to `frontend`, build command to `npm run build`, output directory to `dist`, and set `VITE_API_BASE_URL` to `https://your-render-service.onrender.com/api`. The checked-in `frontend/vercel.json` rewrites browser routes to `index.html`, so direct links and page refreshes work.

The JSON file and local image directory are only used when `DATABASE_URL` is not set (for local development). Production startup refuses to run without `DATABASE_URL`. Administrator passwords are bcrypt-hashed, signup requires a private invite code, signup attempts are rate-limited, and the API caps admin accounts at three.

Card fields are demo UI only; connect a PCI-compliant payment provider before accepting real card data. Configure `VITE_MERCHANT_WHATSAPP_NUMBER` only with the authorized merchant number.

## Checks

```powershell
cd frontend
npm run build
cd ..\backend
npm test
```
