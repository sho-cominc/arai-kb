import os
import json
from flask import Flask, request, jsonify, send_from_directory
import google.generativeai as genai
import time
import psycopg2
import psycopg2.extras

app = Flask(__name__, static_folder='.', static_url_path='')

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
DATABASE_URL = os.environ.get('DATABASE_URL', '')


def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    return conn


def init_db():
    if not DATABASE_URL:
        print('[WARN] DATABASE_URL not set — document persistence disabled')
        return
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('''
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'other',
                tags TEXT DEFAULT '[]',
                source TEXT DEFAULT '',
                url TEXT DEFAULT '',
                content TEXT DEFAULT '',
                summary TEXT DEFAULT '',
                type TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        cur.close()
        conn.close()
        print('[OK] Database initialized')
    except Exception as e:
        print('[ERROR] Database init failed: ' + str(e))

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def error_response(message):
    payload = json.dumps({
        'answer': message,
        'items': [],
        'table_rows': [],
        'source': None
    })
    return jsonify({'content': [{'text': payload}]})


@app.route('/api/chat', methods=['POST'])
def chat():
    if not GEMINI_API_KEY:
        return error_response('GEMINI_API_KEY が設定されていません。Replitの環境変数に設定してください。')

    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return error_response('リクエストが不正です。'), 400

    messages = data.get('messages', [])
    if not isinstance(messages, list) or not messages:
        return error_response('メッセージが空です。'), 400

    system = data.get('system', '')
    max_tokens = min(int(data.get('max_tokens', 1000)), 4096)

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
            )
        )

        text = response.text

        return jsonify({'content': [{'text': text}]})

    except Exception:
        return error_response('AIの応答中にエラーが発生しました。しばらく待ってからもう一度お試しください。')


@app.route('/api/docs', methods=['GET'])
def list_docs():
    if not DATABASE_URL:
        return jsonify([])
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute('SELECT * FROM documents ORDER BY created_at DESC')
        rows = cur.fetchall()
        cur.close()
        conn.close()
    except Exception:
        return jsonify({'error': 'Database connection failed'}), 500
    result = []
    for row in rows:
        doc = dict(row)
        try:
            doc['tags'] = json.loads(doc.get('tags', '[]'))
        except (json.JSONDecodeError, TypeError):
            doc['tags'] = []
        if doc.get('created_at'):
            doc['created_at'] = doc['created_at'].isoformat()
        result.append(doc)
    return jsonify(result)


@app.route('/api/docs', methods=['POST'])
def create_doc():
    if not DATABASE_URL:
        return jsonify({'error': 'DATABASE_URL not configured'}), 500
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    doc_id = data.get('id', 'doc_' + str(int(time.time() * 1000)))
    tags_json = json.dumps(data.get('tags', []), ensure_ascii=False)
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO documents (id, title, category, tags, source, url, content, summary, type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                title=EXCLUDED.title, category=EXCLUDED.category, tags=EXCLUDED.tags,
                source=EXCLUDED.source, url=EXCLUDED.url, content=EXCLUDED.content,
                summary=EXCLUDED.summary, type=EXCLUDED.type
        ''', (
            doc_id,
            data.get('title', ''),
            data.get('category', 'other'),
            tags_json,
            data.get('source', ''),
            data.get('url', ''),
            data.get('content', ''),
            data.get('summary', ''),
            data.get('type', ''),
        ))
        cur.close()
        conn.close()
    except Exception:
        return jsonify({'error': 'Database write failed'}), 500
    return jsonify({'id': doc_id, 'ok': True})


@app.route('/api/docs/<doc_id>', methods=['DELETE'])
def delete_doc(doc_id):
    if not DATABASE_URL:
        return jsonify({'error': 'DATABASE_URL not configured'}), 500
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('DELETE FROM documents WHERE id = %s', (doc_id,))
        cur.close()
        conn.close()
    except Exception:
        return jsonify({'error': 'Database delete failed'}), 500
    return jsonify({'ok': True})


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)


init_db()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
