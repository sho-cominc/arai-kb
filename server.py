import os
import json
from flask import Flask, request, jsonify, send_from_directory
import google.generativeai as genai

app = Flask(__name__, static_folder='.', static_url_path='')

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

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
            model_name='gemini-2.0-flash',
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


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
