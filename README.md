# Advanced ChatGPT Project

## Project Overview
Comprehensive chatbot application with three core functionalities:
- General conversational interface
- Audio file recognition
- PDF document interaction

## Features
- Real-time conversational AI
- Multilingual support
- Audio transcription
- PDF document interaction

## Technology Stack
- Backend: Django 4.2.0
- AI Model: OpenAI GPT
- Speech Recognition: Google Speech-to-Text
- PDF Processing: PyPDF2
- Frontend: Django Template

## Installation

### Prerequisites
- Python 3.8+
- Django 4.2.0
- OpenAI API Key

### Setup Steps
```bash
# Clone repository
git clone https://github.com/vmaxPower1211/ChatGPT__Clone.git

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install Django and dependencies
pip install django==4.2.0
pip install -r requirements.txt

# Setup database
python manage.py migrate
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

## Configuration
Create `.env` file:
```
OPENAI_API_KEY=your_api_key
```

## Security
- CSRF protection
- End-to-end encryption
- Data anonymization

## Contributions
Pull requests welcome. Read `README.md`

## Web Interface
https://127.0.0.1:8000/admin
https://127.0.0.1:8000
