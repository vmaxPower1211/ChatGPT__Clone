from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('chat/', views.chat, name='new_chat'),
    path('delete_chat/<int:chat_id>/', views.delete_chat, name='delete_chat'),
    path('chat/<int:chat_id>/', views.chat, name='chat'),
    path('process_message/', views.process_message, name='process_message'),
]