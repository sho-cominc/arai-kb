import os
import json
import time
import traceback
from flask import Flask, request, jsonify, send_from_directory
from io import BytesIO
from pypdf import PdfReader
from PIL import Image as PILImage
import google.generativeai as genai

app = Flask(__name__, static_folder='.', static_url_path='')

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
DATABASE_URL = os.environ.get("DATABASE_URL", "")

db_conn = None


def get_db():
    import psycopg2
    global db_conn
    try:
        if db_conn is not None:
            try:
                with db_conn.cursor() as cur:
                    cur.execute("SELECT 1")
            except Exception:
                try:
                    db_conn.close()
                except Exception:
                    pass
                db_conn = None
        if db_conn is None:
            clean_url = DATABASE_URL.split('?')[0]
            db_conn = psycopg2.connect(clean_url, sslmode='require', connect_timeout=10)
            db_conn.autocommit = True
        return db_conn
    except Exception as e:
        print("[ERROR] DB connection failed: " + str(e))
        traceback.print_exc()
        db_conn = None
        return None
def init_db():
    if not DATABASE_URL:
        print("[WARN] DATABASE_URL not set -- document persistence disabled")
        return
    try:
        conn = get_db()
        if not conn:
            return
        with conn.cursor() as cur:
            cur.execute(
                "CREATE TABLE IF NOT EXISTS documents ("
                "id TEXT PRIMARY KEY, title TEXT, category TEXT, tags JSONB,"
                "source TEXT, url TEXT, content TEXT, summary TEXT, type TEXT,"
                "created_at TIMESTAMPTZ DEFAULT NOW())"
            )
            cur.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal'")
            cur.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'")
            cur.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS valid_until DATE DEFAULT NULL")
            cur.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''")
        print("[OK] Database initialized")
    except Exception as e:
        print("[ERROR] DB init failed: " + str(e))
        traceback.print_exc()
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print('[OK] Gemini API key configured')
else:
    print('[WARN] GEMINI_API_KEY not set — chat will not work')


def chat_error(message, status=200):
    payload = json.dumps({
        'answer': message,
        'items': [],
        'table_rows': [],
        'source': None
    })
    resp = jsonify({'content': [{'text': payload}]})
    resp.status_code = status
    return resp


@app.route('/api/chat', methods=['POST'])
def chat():
    if not GEMINI_API_KEY:
        return chat_error('GEMINI_API_KEY が設定されていません。環境変数に設定してください。', 503)

    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return chat_error('リクエストが不正です。'), 400

    messages = data.get('messages', [])
    if not isinstance(messages, list) or not messages:
        return chat_error('メッセージが空です。'), 400

    system = data.get('system', '')
    max_tokens = min(int(data.get('max_tokens', 2000)), 4096)

    try:
        model = genai.GenerativeModel(
            model_name='gemini-2.5-flash',
            system_instruction=system if system else None,
        )

        gemini_history = []
        for msg in messages[:-1]:
            role = 'user' if msg.get('role') == 'user' else 'model'
            gemini_history.append({'role': role, 'parts': [msg.get('content', '')]})

        chat_session = model.start_chat(history=gemini_history)

        last_msg = messages[-1].get('content', '')

        response = chat_session.send_message(
            last_msg,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                response_mime_type="application/json",
            )
        )

        text = response.text
        return jsonify({'content': [{'text': text}]})

    except Exception as e:
        print('[ERROR] /api/chat failed: ' + str(e))
        traceback.print_exc()
        return chat_error('AIの応答中にエラーが発生しました: ' + str(e)), 500


@app.route('/api/docs', methods=['GET'])
def list_docs():
    if not DATABASE_URL:
        return jsonify({"error": "DATABASE_URL not configured"}), 503
    try:
        conn = get_db()
        if not conn:
            return jsonify({"error": "DB connection failed"}), 500
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, title, category, tags, source, url, content, summary, type, created_at,"
                " priority, status, valid_until, notes"
                " FROM documents ORDER BY created_at DESC"
            )
            rows = cur.fetchall()
        result = []
        for row in rows:
            result.append({
                "id": row[0], "title": row[1], "category": row[2],
                "tags": row[3] if row[3] else [],
                "source": row[4], "url": row[5], "content": row[6],
                "summary": row[7], "type": row[8],
                "created_at": row[9].isoformat() if row[9] else None,
                "priority": row[10] or "normal",
                "status": row[11] or "active",
                "valid_until": row[12].isoformat() if row[12] else None,
                "notes": row[13] or "",
            })
        return jsonify(result)
    except Exception as e:
        print("[ERROR] /api/docs GET failed: " + str(e))
        traceback.print_exc()
        return jsonify({"error": "DB read failed: " + str(e)}), 500
@app.route('/api/docs', methods=['POST'])

def create_doc():
    if not DATABASE_URL:
        return jsonify({"error": "DATABASE_URL not configured"}), 503
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid request"}), 400
    doc_id = data.get("id", "doc_" + str(int(time.time() * 1000)))
    try:
        conn = get_db()
        if not conn:
            return jsonify({"error": "DB connection failed"}), 500
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO documents (id, title, category, tags, source, url, content, summary, type, priority, status, valid_until, notes)"
                " VALUES (%s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
                " ON CONFLICT (id) DO UPDATE SET"
                " title=EXCLUDED.title, category=EXCLUDED.category, tags=EXCLUDED.tags,"
                " source=EXCLUDED.source, url=EXCLUDED.url, content=EXCLUDED.content,"
                " summary=EXCLUDED.summary, type=EXCLUDED.type,"
                " priority=EXCLUDED.priority, status=EXCLUDED.status,"
                " valid_until=EXCLUDED.valid_until, notes=EXCLUDED.notes",
                (
                    doc_id,
                    data.get("title", ""),
                    data.get("category", "other"),
                    json.dumps(data.get("tags", [])),
                    data.get("source", ""),
                    data.get("url", ""),
                    data.get("content", ""),
                    data.get("summary", ""),
                    data.get("type", ""),
                    data.get("priority", "normal"),
                    data.get("status", "active"),
                    data.get("valid_until") or None,
                    data.get("notes", ""),
                )
            )
        print("[OK] Document saved: " + doc_id)
    except Exception as e:
        print("[ERROR] /api/docs POST failed: " + str(e))
        traceback.print_exc()
        return jsonify({"error": "DB write failed: " + str(e)}), 500
    return jsonify({"id": doc_id, "ok": True})
@app.route('/api/docs/<doc_id>', methods=['DELETE'])

def delete_doc(doc_id):
    if not DATABASE_URL:
        return jsonify({"error": "DATABASE_URL not configured"}), 503
    try:
        conn = get_db()
        if not conn:
            return jsonify({"error": "DB connection failed"}), 500
        with conn.cursor() as cur:
            cur.execute("DELETE FROM documents WHERE id = %s", (doc_id,))
        print("[OK] Document deleted: " + doc_id)
    except Exception as e:
        print("[ERROR] /api/docs DELETE failed: " + str(e))
        traceback.print_exc()
        return jsonify({"error": "DB delete failed: " + str(e)}), 500
    return jsonify({"ok": True})

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"gemini": bool(GEMINI_API_KEY), "database": bool(DATABASE_URL)})


@app.route('/api/extract', methods=['POST'])
def extract_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    f = request.files['file']
    filename = f.filename or ''
    ext = filename.rsplit('.', 1)[-1].lower()
    file_bytes = f.read()

    if ext == 'pdf':
        try:
            reader = PdfReader(BytesIO(file_bytes))
            pages = [page.extract_text() for page in reader.pages]
            text = '\n\n'.join(p.strip() for p in pages if p and p.strip())
            if not text:
                text = '（テキスト抽出できませんでした。スキャンPDFの可能性があります）'
            return jsonify({"text": text})
        except Exception as e:
            print("[ERROR] PDF extract failed: " + str(e))
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    elif ext in ('jpg', 'jpeg', 'png'):
        if not GEMINI_API_KEY:
            return jsonify({"error": "GEMINI_API_KEY not configured"}), 503
        try:
            import base64
            img = PILImage.open(BytesIO(file_bytes)).convert('RGB')
            # Compress: cap at 1024px wide, JPEG quality 75
            max_w = 1024
            if img.width > max_w:
                img = img.resize((max_w, int(img.height * max_w / img.width)), PILImage.LANCZOS)
            buf = BytesIO()
            img.save(buf, format='JPEG', quality=75, optimize=True)
            image_b64 = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode('utf-8')
            # Use Gemini to extract/describe content
            model = genai.GenerativeModel('gemini-2.5-flash')
            prompt = (
                'This image is from a hotel knowledge base document. '
                'Extract and transcribe ALL text visible exactly as written. '
                'Reproduce tables as plain text, not markdown. '
                'If there is no text, describe the visual content in detail in Japanese. '
                'Do not describe logos or decorative elements unless they contain text.'
            )
            response = model.generate_content([prompt, img])
            return jsonify({"text": response.text.strip(), "image_b64": image_b64})
        except Exception as e:
            print("[ERROR] Image extract failed: " + str(e))
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    else:
        return jsonify({"error": "Unsupported file type: " + ext}), 400


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)


init_db()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
