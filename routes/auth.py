from flask import Blueprint
from flask_jwt_extended import create_access_token
from flask import jsonify, request
from werkzeug.security import  check_password_hash
from models.usuario import Usuario
from db import db
from utils.validar_recaptcha import validar_recaptchar


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
            access_token = create_access_token(identity=str(usuario.id))
            return jsonify(access_token=access_token, mensagem="Login realizado com sucesso"), 200
        else:
            return jsonify(mensagem="Email ou senha inválidos"), 401

    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro interno no servidor", detalhe=str(e)), 500