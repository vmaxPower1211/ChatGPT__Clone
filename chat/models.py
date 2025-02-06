from django.db import models
from django.contrib.auth.models import User

class Chat(models.Model):
    title = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    chat_type = models.CharField(max_length=20, default='chat')
    files = models.FileField(upload_to='chat_files/', null=True, blank=True)

class Message(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE)
    content = models.TextField()
    is_user = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)
    
