import os
import json
import time
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_from_directory
import google.generativeai as genai

app = Flask(__name__, static_folder='.', static_url_path='')

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
FIREBASE_CREDENTIALS = os.environ.get('FIREBASE_CREDENTIALS', '')

firestore_db = None


def init_firestore():
    global firestore_db
    if not FIREBASE_CREDENTIALS:
        print('[WARN] FIREBASE_CREDENTIALS not set — document persistence disabled')
        return
    try:
        from google.cloud import firestore
        from google.oauth2 import service_account
        creds_dict = json.loads(FIREBASE_CREDENTIALS)
        credentials = service_account.Credentials.from_service_account_info(creds_dict)
        firestore_db = firestore.Client(credentials=credentials, project=creds_dict.get('project_id'))
        print('[OK] Firestore initialized')
    except Exception as e:
        print('[ERROR] Firestore init failed: ' + str(e))

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
    if not firestore_db:
        return jsonify({'error': 'FIREBASE_CREDENTIALS not configured'}), 500
    try:
        docs_ref = firestore_db.collection('documents').order_by('created_at', direction='DESCENDING')
        result = []
        for doc_snapshot in docs_ref.stream():
            doc = doc_snapshot.to_dict()
            doc['id'] = doc_snapshot.id
            if doc.get('tags') is None:
                doc['tags'] = []
            ca = doc.get('created_at')
            if ca and hasattr(ca, 'isoformat'):
                doc['created_at'] = ca.isoformat()
            elif ca:
                doc['created_at'] = str(ca)
            result.append(doc)
        return jsonify(result)
    except Exception:
        return jsonify({'error': 'Firestore read failed'}), 500


@app.route('/api/docs', methods=['POST'])
def create_doc():
    if not firestore_db:
        return jsonify({'error': 'FIREBASE_CREDENTIALS not configured'}), 500
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    doc_id = data.get('id', 'doc_' + str(int(time.time() * 1000)))
    doc_data = {
        'title': data.get('title', ''),
        'category': data.get('category', 'other'),
        'tags': data.get('tags', []),
        'source': data.get('source', ''),
        'url': data.get('url', ''),
        'content': data.get('content', ''),
        'summary': data.get('summary', ''),
        'type': data.get('type', ''),
        'created_at': datetime.now(timezone.utc),
    }
    try:
        firestore_db.collection('documents').document(doc_id).set(doc_data)
    except Exception:
        return jsonify({'error': 'Firestore write failed'}), 500
    return jsonify({'id': doc_id, 'ok': True})


@app.route('/api/docs/<doc_id>', methods=['DELETE'])
def delete_doc(doc_id):
    if not firestore_db:
        return jsonify({'error': 'FIREBASE_CREDENTIALS not configured'}), 500
    try:
        firestore_db.collection('documents').document(doc_id).delete()
    except Exception:
        return jsonify({'error': 'Firestore delete failed'}), 500
    return jsonify({'ok': True})


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)


init_firestore()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
