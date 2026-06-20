import requests
import os

def validar_recaptchar(token):
    
    if os.getenv('FLASK_ENV') == 'development':
        return True
    
    if not token:
        return False
    try:
        resposta = requests.post(
            'https://www.google.com/recaptcha/api/siteverify', 
            data={
                'secret': os.getenv("RECAPTCHA_SECRET_KEY"),
                'response': token
                    }).json()
    
        return resposta.get('success', False)
    
    except Exception:
        return False
    