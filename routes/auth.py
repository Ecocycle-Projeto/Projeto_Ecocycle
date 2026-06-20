from flask import Blueprint
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from flask import jsonify, request
from werkzeug.security import  check_password_hash
from models.usuario import Usuario
from db import db
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from werkzeug.security import generate_password_hash # Para salvar a nova senha
from utils.validar_recaptcha import validar_recaptchar
from utils.validar_email import validar_email # Adicione a importação do seu arquivo
from utils.email import enviar_email_recuperacao # O arquivo novo de envio que vamos criar
from flask import current_app


auth_bp = Blueprint('auth',__name__)


@auth_bp.route('/auth/login', methods=['POST'])
def autenticar():
    try:
        dados = request.get_json()
        email = dados.get('email')
        senha = dados.get('senha')
        recaptcha_response = dados.get('g-recaptcha-response')

        if not validar_recaptchar(recaptcha_response):
            return jsonify(mensagem="Verificação do reCAPTCHA falhou ou ausente!"), 400

        usuario = Usuario.query.filter_by(email=email).first()
        if usuario and check_password_hash(usuario.senha, senha):

            additional_claims = {'role': usuario.role}

            access_token  = create_access_token(
                identity=str(usuario.id),
                additional_claims=additional_claims
            )
            refresh_token = create_refresh_token(
                identity=str(usuario.id),
                additional_claims=additional_claims
            )

            return jsonify(
                access_token=access_token,
                refresh_token=refresh_token,
                user=usuario.to_dict(),
                mensagem="Login realizado com sucesso"
            ), 200
        else:
            return jsonify(mensagem="Email ou senha inválidos"), 401

    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro interno no servidor", detalhe=str(e)), 500
    

@auth_bp.route('/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    try:
        usuario_id = get_jwt_identity()
        novo_access_token = create_access_token(identity=usuario_id)
        
        return jsonify(access_token=novo_access_token), 200
    except Exception as e:
        return jsonify(erro="Não foi possível renovar o acesso"), 401
    
@auth_bp.route('/auth/recuperar_senha', methods=['POST'])
def solicitar_recuperacao():
    try:
        dados = request.get_json()
        email = dados.get('email')
        recaptcha_response = dados.get('g-recaptcha-response')

        # 1. Valida o formato do e-mail usando o seu arquivo utilitário
        if not validar_email(email):
            return jsonify(mensagem="Formato de e-mail inválido!"), 400

        # 2. Valida o reCAPTCHA
        if not validar_recaptchar(recaptcha_response):
            return jsonify(mensagem="Verificação do reCAPTCHA falhou ou ausente!"), 400

        usuario = Usuario.query.filter_by(email=email).first()
        
        # 3. Retorna sucesso genérico para não expor e-mails cadastrados
        if not usuario:
            return jsonify(mensagem="Se o e-mail estiver cadastrado, um link de recuperação foi enviado."), 200

        # 4. Gera o token e envia a mensagem
        serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        token = serializer.dumps(email, salt='recuperacao-de-senha')
        link_recuperacao = f"http://localhost:5000/redefinir_senha.html?token={token}"

        if enviar_email_recuperacao(email, link_recuperacao):
            return jsonify(mensagem="Se o e-mail estiver cadastrado, um link de recuperação foi enviado."), 200
        else:
            return jsonify(mensagem="Erro interno ao tentar disparar o e-mail."), 500

    except Exception as e:
        return jsonify(erro="Erro interno no servidor", detalhe=str(e)), 500


@auth_bp.route('/auth/redefinir_senha', methods=['POST'])
def redefinir_senha():
    try:
        dados = request.get_json()
        token = dados.get('token')
        nova_senha = dados.get('nova_senha')

        if not token or not nova_senha:
            return jsonify(mensagem="Token e nova senha são obrigatórios."), 400

        serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        
        try:
            # Tenta descriptografar o token. max_age = 3600 segundos (1 hora de validade)
            email = serializer.loads(token, salt='recuperacao-de-senha', max_age=3600)
        except SignatureExpired:
            return jsonify(mensagem="O link de recuperação expirou. Solicite um novo."), 400
        except BadSignature:
            return jsonify(mensagem="Link de recuperação inválido ou corrompido."), 400

        # Se passou pelo try, o token é válido e temos o e-mail. Vamos atualizar.
        usuario = Usuario.query.filter_by(email=email).first()
        if not usuario:
            return jsonify(mensagem="Usuário não encontrado."), 404

        # Faz o hash da nova senha e salva
        senha_hash = generate_password_hash(nova_senha, method='pbkdf2:sha256')
        usuario.senha = senha_hash
        
        db.session.commit()
        return jsonify(mensagem="Senha atualizada com sucesso! Você já pode fazer login."), 200

    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro interno no servidor", detalhe=str(e)), 500