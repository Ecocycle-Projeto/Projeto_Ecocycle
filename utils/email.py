import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app

def enviar_email_recuperacao(destinatario, link_recuperacao):
    # O ideal é puxar essas credenciais do seu arquivo .env / config
    remetente = current_app.config.get('MAIL_USERNAME', 'seuemail@gmail.com')
    senha = current_app.config.get('MAIL_PASSWORD', 'suasenha')
    servidor = current_app.config.get('MAIL_SERVER', 'smtp.gmail.com')
    porta = current_app.config.get('MAIL_PORT', 587)

    msg = MIMEMultipart()
    msg['From'] = remetente
    msg['To'] = destinatario
    msg['Subject'] = "Recuperação de Senha - Eco Cycle"

    corpo_email = f"""
    Olá!
    
    Você solicitou a recuperação de senha na plataforma Eco Cycle.
    Clique no link abaixo para redefinir sua senha:
    
    {link_recuperacao}
    
    Este link é válido por 1 hora. Se você não solicitou essa recuperação, por favor ignore este e-mail.
    """
    
    msg.attach(MIMEText(corpo_email, 'plain', 'utf-8'))

    try:
        server = smtplib.SMTP(servidor, porta)
        server.starttls() # Criptografa a conexão
        server.login(remetente, senha)
        server.sendmail(remetente, destinatario, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
        return False