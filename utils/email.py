import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def enviar_email_recuperacao(destinatario_email, link_recuperacao):
    # Puxa as credenciais diretamente do .env
    remetente_email = os.getenv("MAIL_USERNAME")
    senha_app = os.getenv("MAIL_PASSWORD")
    servidor_smtp = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    porta = int(os.getenv("MAIL_PORT", 587))

    # Monta a estrutura da mensagem
    msg = MIMEMultipart()
    msg['From'] = remetente_email
    msg['To'] = destinatario_email
    msg['Subject'] = "Eco Cycle - Recuperação de Senha"

    # Corpo do e-mail
    corpo = f"Olá!\n\nVocê solicitou a recuperação de senha.\nClique no link abaixo para redefinir:\n{link_recuperacao}\n\nSe não foi você, ignore este e-mail."
    msg.attach(MIMEText(corpo, 'plain'))

    try:
        # Conecta ao servidor do Google e faz o disparo
        server = smtplib.SMTP(servidor_smtp, porta)
        server.starttls() # Inicia a criptografia exigida pelo Gmail
        server.login(remetente_email, senha_app)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print("=== ERRO NO DISPARO DE E-MAIL ===")
        print(str(e))
        print("=================================")
        return False