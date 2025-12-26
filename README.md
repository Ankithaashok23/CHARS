# CHARS
DSA EL
# Complaint Handling and Resolution System
DSA-based college complaint management system with role-based access and dynamic priority handling.

## Run locally

Quick start to run frontend + backend together:

1. Install Node dependencies and start the backend server:

```bash
cd backend
npm install
npm start
```

2. Open the site at http://localhost:3000/login.html — the Express server serves the frontend and provides the REST API at `/api/*`.

If you prefer just to preview the static frontend, you can serve the `frontend/` folder with `python3 -m http.server` and open the HTML files directly.

### Run with MongoDB (Docker Compose) ✅

To run a local MongoDB instance together with the backend using Docker Compose:

```bash
docker compose up --build
```

This starts a `mongo` service and the `backend` on `http://localhost:3000`. The Express server will connect to `mongodb://mongo:27017/chars` when run via Docker Compose.

### Using MongoDB Atlas or custom Mongo

1. Create an Atlas cluster or obtain a MongoDB connection URI.
2. Set `MONGODB_URI` environment variable before starting the backend (or put it in `backend/.env`):

```bash
export MONGODB_URI="your-mongodb-uri"
cd backend
npm start
```

The app will use that URI to persist complaints to MongoDB.

### MongoDB Atlas (step-by-step) 🔐

1. Create a free account at https://www.mongodb.com/cloud/atlas and create a new **cluster**.
2. In the Atlas UI, under **Database Access**, create a **Database User** and copy the username and password.
3. Under **Network Access**, add your IP address or allow access from anywhere (0.0.0.0/0) for quick testing.
4. Go to **Clusters → Connect → Connect your application** and copy the connection string (it starts with `mongodb+srv://` or `mongodb://`).
	 - Replace `<username>` and `<password>` in the string with the values you created. Example:
		 `mongodb+srv://dbuser:mySecretPassword@cluster0.example.mongodb.net/chars?retryWrites=true&w=majority`
5. Set the `MONGODB_URI` environment variable in the environment where your backend runs (local `.env`, Render/Heroku/Railway secret, or GitHub Actions secret):

```bash
export MONGODB_URI="mongodb+srv://dbuser:PASS@cluster0.example.mongodb.net/chars?retryWrites=true&w=majority"
cd backend
npm start
```

6. Verify the connection by creating a complaint (use the API or UI): `POST /api/complaints`.

Security tips 💡
- Avoid committing credentials. Use `backend/.env` locally (and add it to `.gitignore`) and set secrets in your hosting provider for production.
- For production, restrict Atlas Network Access to your app's outbound IPs or use a private peering connection.

### Deploying with Render + Atlas (summary)

If you deploy to Render, set the `MONGODB_URI` secret in Render Dashboard (Environment → Environment Variables) and add the `RENDER_SERVICE_ID` and `RENDER_API_KEY` secrets to GitHub to enable automatic deploys via the workflow below.

