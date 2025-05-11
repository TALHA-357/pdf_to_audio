import os
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from PyPDF2 import PdfReader
from gtts import gTTS
from deep_translator import GoogleTranslator
import uuid

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit
app.config['ALLOWED_EXTENSIONS'] = {'pdf'}

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def extract_text_from_pdf(pdf_path):
    text = ""
    with open(pdf_path, 'rb') as file:
        reader = PdfReader(file)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text

@app.route('/', methods=['GET', 'POST'])
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            extracted_text = extract_text_from_pdf(filepath)
            return jsonify({
                'success': True,
                'text': extracted_text,
                'filename': filename
            })
        except Exception as e:
            return jsonify({'error': f'Error processing PDF: {str(e)}'}), 500
    else:
        return jsonify({'error': 'Invalid file type. Only PDFs are allowed.'}), 400

@app.route('/generate_audio', methods=['POST'])
def generate_audio():
    data = request.json
    text = data.get('text', '')
    language = data.get('language', 'en')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    try:
        # Generate unique filename for audio
        audio_filename = f"audio_{uuid.uuid4().hex}.mp3"
        audio_path = os.path.join(app.config['UPLOAD_FOLDER'], audio_filename)
        
        # Create audio file
        tts = gTTS(text=text, lang=language, slow=False)
        tts.save(audio_path)
        
        return jsonify({
            'success': True,
            'audio_url': f'/download/{audio_filename}'
        })
    except Exception as e:
        return jsonify({'error': f'Error generating audio: {str(e)}'}), 500

@app.route('/translate', methods=['POST'])
def translate_text():
    data = request.json
    text = data.get('text', '')
    dest_lang = data.get('dest_language', 'en')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    try:
        # First 5000 characters to avoid API limits
        text_to_translate = text[:5000]
        translator = GoogleTranslator(source='auto', target=dest_lang)
        translated_text = translator.translate(text_to_translate)
        
        return jsonify({
            'success': True,
            'translated_text': translated_text,
            'source_language': 'auto',
            'dest_language': dest_lang,
            'note': 'Translated first 5000 characters' if len(text) > 5000 else ''
        })
    except Exception as e:
        return jsonify({'error': f'Error translating text: {str(e)}'}), 500

@app.route('/download/<filename>')
def download_file(filename):
    return send_file(
        os.path.join(app.config['UPLOAD_FOLDER'], filename),
        as_attachment=True
    )

if __name__ == '__main__':
    app.run(debug=True)