import smtplib
from email.message import EmailMessage

# --- COLOQUE SUAS CREDENCIAIS AQUI ---
seu_email = "eunaosei3412@gmail.com"
senha_de_16_digitos = "zafk ulgc sauv qevt" # Substitua pela sua senha de app SEM ESPAÇOS

try:
    msg = EmailMessage()
    msg.set_content("Este é um teste de envio do servidor SMTP do Gmail.")
    msg['Subject'] = "Teste de E-mail"
    msg['From'] = seu_email
    msg['To'] = seu_email

    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    
    # Remove espaços da senha caso você tenha copiado com eles
    senha_limpa = senha_de_16_digitos.replace(" ", "")
    
    server.login(seu_email, senha_limpa)
    server.send_message(msg)
    server.quit()
    
    print("Sucesso! O e-mail foi enviado.")
except Exception as e:
    print(f"Erro: {e}")