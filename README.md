# Sandiego Collections local development

## Requirements

- Node.js 20 or newer
- npm

## First-time setup

Open two terminals from the workspace root and install each app's dependencies:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Set unique values for `JWT_SECRET` and `ADMIN_SIGNUP_INVITE` in `backend/.env` before registering administrators. The admin invitation must be shared privately. The first three valid invited accounts can register; subsequent attempts are rejected by the API.

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

## Local persistence and security notes

The API creates `backend/data/store.json` on first startup and stores users, admins, products, and orders there. Uploaded product images are stored in `backend/uploads/`. The local JSON store is intended for development; replace it with PostgreSQL/Supabase before deploying multiple server instances. Administrator passwords are bcrypt-hashed, signup requires a private invite code, signup attempts are rate-limited, and the API caps admin accounts at three.

Card fields are demo UI only; connect a PCI-compliant payment provider before accepting real card data. Configure `VITE_MERCHANT_WHATSAPP_NUMBER` only with the authorized merchant number.

## Checks

```powershell
cd frontend
npm run build
cd ..\backend
npm test
```
