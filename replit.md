# LOTTE ARAI RESORT — Staff Knowledge Base

## Overview
A single-page hotel staff knowledge base and chat interface for LOTTE ARAI RESORT. The application supports Japanese, English, and Korean and allows staff to query built-in knowledge data and upload Excel/CSV documents.

## Project Structure
- `hotel_kb_chat.html` — Main HTML markup (no inline CSS or JS)
- `index.html` — Redirect page that forwards root URL to the main app
- `style.css` — All application styles
- `server.py` — Flask backend serving static files and proxying AI requests to Google Gemini
- `js/config.js` — API endpoint and model configuration constants
- `js/utils.js` — DOM helper functions (el, showModal, hideModal, setDisplay)
- `js/i18n.js` — Multilingual dictionary (JP/EN/KR) and language switcher
- `js/data.js` — Built-in knowledge data (activity prices, discount tiers, Q&A)
- `js/modal.js` — Modal dialog management and built-in sheet rendering
- `js/docs.js` — User document state management (CRUD, list rendering, sidebar)
- `js/files.js` — File upload handling (drag & drop, xlsx/csv/md/txt/pdf parsing)
- `js/ai-tag.js` — AI-powered auto-tagging for uploaded documents
- `js/chat.js` — AI chat interface (message sending, answer rendering)
- `js/app.js` — Application initialization and event listener registration

## Tech Stack
- Pure HTML/CSS/JavaScript frontend (no build step required)
- Flask (Python) backend for API proxying
- Google Gemini API (gemini-2.0-flash) for AI features
- Uses XLSX.js (via CDN) for Excel file parsing
- Google Fonts for typography (Cormorant Garamond, Noto Sans JP)

## Environment Variables
- `GEMINI_API_KEY` — Google Gemini API key (required, stored as Replit secret)

## Running the App
The app is served via Flask:
```
python3 server.py
```
Access at: `http://localhost:5000`

## API Endpoints
- `POST /api/chat` — Proxies AI requests to Google Gemini. Accepts `{messages, system, max_tokens}`, returns `{content: [{text: "..."}]}` (Claude-compatible format for frontend compatibility).

## Features
- Multilingual chat interface (JP/EN/KR)
- Quick question shortcuts in sidebar
- Built-in knowledge data (概要シート, 料金区分, Q&A)
- Document upload support (Excel/CSV via drag-and-drop or file picker)
- Category-based document organization
- AI auto-tagging of uploaded documents

## Deployment
Configured as a static site deployment. The public directory is `.` (root).
