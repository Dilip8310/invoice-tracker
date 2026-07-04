# Deploying the Invoice Tracker to Railway (Unified Setup)

We have unified the Vite React frontend and Spring Boot backend into a single application package. The backend compiles the React project and copies its static assets into the resources static directory. This means:
- You only need to host **one** service on Railway.
- No CORS configuration issues.
- Dynamic port allocation.

---

## 🛠️ Step 1: Initialize Git and Commit Changes

Since Railway deploys projects from GitHub, you need to push the codebase to a repository.

Run these commands in the project root directory (`/Users/diliph/invoice-tracker`):

```bash
# 1. Initialize git
git init

# 2. Add files
git add .

# 3. Create your first commit
git commit -m "Initial commit: Unified Spring Boot + React invoice tracker"
```

Create a new repository on your GitHub account (e.g. `invoice-tracker`), then push your code:

```bash
# 4. Link your remote GitHub repo
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/invoice-tracker.git

# 5. Set branch name and push
git branch -M main
git push -u origin main
```

---

## 🚀 Step 2: Deploy to Railway

1. Open [Railway.app](https://railway.app/) and log into your account.
2. Click **New Project** -> Select **Deploy from GitHub repo**.
3. Choose your repository (`invoice-tracker`).
4. Click **Deploy Now** (this initial deploy might fail or build the wrong folder, which is normal—we need to adjust the directory setting in the next step).

---

## ⚙️ Step 3: Configure Settings on Railway

Since this is a multi-project layout, you need to configure Railway to build and run the `backend` folder.

1. Click on the newly created service card in the Railway dashboard.
2. Go to the **Settings** tab.
3. Under **General**, locate the **Root Directory** setting and change it from `/` to:
   ```text
   backend
   ```
4. Under **Build**, Railway will automatically detect Maven and generate the build command. Ensure the start command is:
   ```text
   java -jar target/invoice-0.0.1-SNAPSHOT.jar
   ```
5. Railway will automatically inject the `$PORT` environment variable, which Spring Boot will listen to.
6. Click **Save** and trigger a **Redeploy**.

---

## 🌐 Step 4: Access your Application

Once the build completes successfully:
1. In the service dashboard, go to the **Settings** tab.
2. Find the **Environment** section and click **Generate Domain** to get a public URL (e.g. `https://invoice-tracker-production.up.railway.app`).
3. Open the URL. The React frontend will launch, connect to the Spring Boot REST APIs, and verify registrations/logins seamlessly!
