import re

def validar_email(email: str) -> bool:
    
    padrao = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(padrao, email) is not None