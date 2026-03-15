# LOTTE ARAI RESORT — Staff Knowledge Base

## Overview
A single-page hotel staff knowledge base and chat interface for LOTTE ARAI RESORT. The application supports Japanese, English, and Korean and allows staff to query built-in knowledge data and upload Excel/CSV documents.

## Project Structure
- `hotel_kb_chat.html` — Main application (self-contained single HTML file with all CSS and JS inline)
- `index.html` — Redirect page that forwards root URL to the main app

## Tech Stack
- Pure HTML/CSS/JavaScript (no build step required)
- Uses XLSX.js (via CDN) for Excel file parsing
- Google Fonts for typography (Cormorant Garamond, Noto Sans JP)
- Entirely client-side — no backend or server-side logic

## Running the App
The app is served via Python's built-in HTTP server:
```
python3 -m http.server 5000 --directory .
```
Access at: `http://localhost:5000`

## Features
- Multilingual chat interface (JP/EN/KR)
- Quick question shortcuts in sidebar
- Built-in knowledge data (概要シート, 料金区分, Q&A)
- Document upload support (Excel/CSV via drag-and-drop or file picker)
- Category-based document organization

## Deployment
Configured as a static site deployment. The public directory is `.` (root).
