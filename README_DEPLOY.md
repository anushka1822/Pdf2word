# Deployment Guide: PDF2Word

This guide explains how to deploy the PDF2Word application using **Render** for the backend and **Vercel** for the frontend, with **Pinecone** as the free cloud vector database.

## 1. Backend (Render)

1. **Dashboard**: Go to [Render.com](https://render.com/) and create a new **Web Service**.
2. **Build Settings**:
   - **Runtime**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. **Environment Variables**:
   - `GOOGLE_API_KEY`: Your Gemini API Key.
   - `PINECONE_API_KEY`: Your Pinecone API Key (`pcsk_4E1so...`).
   - `PINECONE_INDEX_NAME`: The name of your Pinecone index (e.g., `pdf2word`).
   - `FRONTEND_URL`: Your Vercel URL (add this after deploying the frontend).

## 2. Frontend (Vercel)

1. **Dashboard**: Go to [Vercel.com](https://vercel.com/) and connect your repository.
2. **Framework Preset**: Vite
3. **Root Directory**: `frontend`
4. **Environment Variables**:
   - `VITE_API_BASE_URL`: Your Render Web Service URL (e.g., `https://pdf2word-backend.onrender.com`).

## 3. Pinecone Setup

1. Create a free account at [Pinecone.io](https://www.pinecone.io/).
2. Create an index with:
   - **Name**: `pdf2word` (or any name, just match your env var).
   - **Dimension**: `3072` (to match the `gemini-embedding-001` cloud model).
   - **Metric**: `cosine`.

---

## Technical Changes Made for Deployment
- **Cloud Vector DB**: Replaced local ChromaDB with Pinecone Cloud.
- **Ephemeral Filesystem**: Uploads now use `/tmp` for processing, ensuring compatibility with serverless environments.
- **Centralized API Config**: Created `frontend/src/apiConfig.js` to handle dynamic backend URLs.
- **Universal CORS**: Enabled environment-based CORS to allow the frontend to talk to the backend safely.
