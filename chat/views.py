import os
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.core.files.storage import FileSystemStorage
from .models import Chat, Message
import openai
from langchain.document_loaders import PyPDFLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import FAISS
import speech_recognition as sr
from pydub import AudioSegment
import tempfile


@login_required
def delete_chat(request, chat_id):
    try:
        chat = Chat.objects.get(id=chat_id, user=request.user)
        chat.delete()
        return JsonResponse({'status': 'success'})
    except Chat.DoesNotExist:
        return JsonResponse({'status': 'error'}, status=404)
    
@login_required
def index(request):
    chats = Chat.objects.filter(user=request.user).order_by('-created_at')
    
    
    return render(request, 'chat/index.html', {'chats': chats})

@login_required
def chat(request, chat_id=None):
    
    if chat_id:
        chat = Chat.objects.get(id=chat_id)
        messages = Message.objects.filter(chat=chat).order_by('created_at')
    else:
        chat = None
        messages = []
    return render(request, 'chat/chat.html', {
        'chat': chat,
        'messages': messages
    })

@login_required
def process_message(request):
    
    if request.method == 'POST':
        message_type = request.POST.get('type', 'chat')
        content = request.POST.get('content', '')
        chat_id = request.POST.get('chat_id')

        chat = get_or_create_chat(request.user, chat_id, content)
        
        try:
            if message_type == 'chat':
                print("chatting reponse preparing---------------------")
                response = process_chat(content)
                print("chatting reponse generated---------------------")
                print(response)
            elif message_type == 'speech':
                print("audio file response preparing====================")
                audio_file = request.FILES.get('audio')
                if not audio_file:
                    raise ValueError("No audio file provided")
                response = process_speech(audio_file)
                print(response)
            elif message_type == 'pdf':
                print("chatting with pdf response preparing================")
                pdf_files = request.FILES.getlist('pdf')
                print("chatting with pdf response generated===================")
                
                if not pdf_files:
                    raise ValueError("No PDF files provided")
                response = process_pdf(pdf_files, content)
                print(response)
            
            save_messages(chat, content, response)
            return JsonResponse({'response': response, 'chat_id': chat.id, 'status': 'success'})
            
        except Exception as e:
            return JsonResponse({'error': str(e), 'status': 'error'}, status=500)
        
        
def process_chat(content):
    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": content}],
        max_tokens=1500
    )
    return response.choices[0].message.content

def process_openai_chat(content):
    try:
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": content}],
            max_tokens=1000
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI API error: {str(e)}")
        raise

def process_speech(audio_file):
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
        audio = AudioSegment.from_file(audio_file)
        audio.export(temp_audio.name, format="wav")
        

        recognizer = sr.Recognizer()
        with sr.AudioFile(temp_audio.name) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)
        

        os.unlink(temp_audio.name)

        return process_chat(f"Transcribed text: {text}")
    
def process_pdf(pdf_files, query):
    # Save PDFs temporarily
    temp_paths = []
    fs = FileSystemStorage(location=tempfile.gettempdir())
    
    try:

        docs = []
        for pdf in pdf_files:
            temp_path = fs.save(pdf.name, pdf)
            temp_paths.append(temp_path)
            
            loader = PyPDFLoader(os.path.join(tempfile.gettempdir(), temp_path))
            docs.extend(loader.load())

        text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        texts = text_splitter.split_documents(docs)

        embeddings = OpenAIEmbeddings(openai_api_key=os.getenv("OPENAI_API_KEY"))
        db = FAISS.from_documents(texts, embeddings)

        similar_docs = db.similarity_search(query, k=3)
        context = "\n".join([doc.page_content for doc in similar_docs])
        
        
        response = process_chat(f"Context from PDFs: {context}\n\nQuestion: {query}")
        return response

    finally:
        for temp_path in temp_paths:
            try:
                os.unlink(os.path.join(tempfile.gettempdir(), temp_path))
            except:
                pass
            
def get_or_create_chat(user, chat_id, content):
    
    
    if chat_id:
        return Chat.objects.get(id=chat_id)
    
    return Chat.objects.create(user=user, title=content[:50])

def save_messages(chat, user_content, bot_response):
    
    Message.objects.create(chat=chat, content=user_content, is_user=True)
    Message.objects.create(chat=chat, content=bot_response, is_user=False)