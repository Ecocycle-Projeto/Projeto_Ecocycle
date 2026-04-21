from flask import Blueprint
from flask import jsonify, request
from werkzeug.security import generate_password_hash
from models.usuario import Usuario
from utils.validar_recaptcha import validar_recaptchar
from db import db


usuario_bp = Blueprint('usuario', __name__)
# A rota para obter todos os usuários
@usuario_bp.route('/usuario', methods=['GET'])
def get_usuários():
    usuarios = Usuario.query.order_by(Usuario.id.asc()).all()

    usuario = [i.to_dict() for i in usuarios]

    return jsonify(mensagem="Usuários obtidos com sucesso", usuarios=usuario)

# A rota para filtrar usuário por ID
@usuario_bp.route('/usuario/<int:id>', methods=['GET']) 
def filtrar_usuario(id):
    try:
        usuario = Usuario.query.get(id)

        if usuario:
            usuario_dict = usuario.to_dict()
            return jsonify(usuario=usuario_dict), 200
        else:
            return jsonify(mensagem="Usuário não encontrado"), 404
            
    except Exception as e:
        return jsonify(erro=str(e)), 500

# A rota para criar um novo usuário
@usuario_bp.route('/usuario', methods=['POST'])
def criar_usuario():
        data = request.get_json()
        senha_hash = generate_password_hash(data['senha'], method='pbkdf2:sha256')
        novo_usuario = Usuario(nome=data['nome'], email=data['email'], senha=senha_hash)
        recaptcha_response = data.get('g-recaptcha-response')

        if not validar_recaptchar(recaptcha_response):
            return jsonify(mensagem="Verificação do reCAPTCHA falhou ou ausente!"), 400
        
        try:
            db.session.add(novo_usuario)
            db.session.commit()
            return jsonify(mensagem="Usuário criado com sucesso"), 201
        except Exception as e:
            db.session.rollback()
            return jsonify(erro=str(e)), 500  
        
# A rota para atualizar um usuário existente
@usuario_bp.route('/usuario/<int:id>', methods=['PUT'])
def atualizar_usuario(id):
    data = request.get_json()
    senha_hash = generate_password_hash(data['senha'], method='pbkdf2:sha256')
    try:
        usuario = Usuario.query.get(id)
        if not usuario:
            return jsonify(mensagem="Usuário não encontrado"), 404
        
        usuario.nome = data['nome']
        usuario.email = data['email']
        usuario.senha = senha_hash

        db.session.commit()
        return jsonify(mensagem="Usuário atualizado com sucesso"), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify(erro=str(e)), 500

# A rota para deletar um usuário
@usuario_bp.route('/usuario/<int:id>', methods=['DELETE'])
def deletar_usuario(id):
    try:
        usuario = Usuario.query.get(id)

        if not usuario:
            return jsonify(mensagem="Usuário não encontrado"), 404
        
        db.session.delete(usuario)
        db.session.commit()
        return jsonify(mensagem="Usuário deletado com sucesso"), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify(erro=str(e)), 500