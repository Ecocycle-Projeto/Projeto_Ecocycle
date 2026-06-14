from flask import Blueprint, jsonify, request
from models.empresa import Empresa
from flask_jwt_extended import jwt_required
from db import db


empresa_bp = Blueprint('empresa', __name__)

@empresa_bp.route('/empresas', methods=['GET'])
@jwt_required()
def get_empresas():
    empresas = Empresa.query.all()
    return jsonify(mensagem="Empresas obtidas com sucesso!", empresas=[e.to_dict() for e in empresas]), 200

@empresa_bp.route('/empresas/<int:id>', methods=['GET'])
@jwt_required()
def get_empresa(id):
    try:
        empresa = Empresa.query.get(id)
        if not empresa:
            return jsonify(mensagem="Empresa não encontrada"), 404
        return jsonify(empresa=empresa.to_dict()), 200
    except Exception as e:
        return jsonify(erro=str(e)), 500

@empresa_bp.route('/empresas', methods=['POST'])
@jwt_required()
def criar_empresa():
    try:
        dados = request.get_json()

        # Verifica se CNPJ ou email já existem
        if Empresa.query.filter_by(cnpj=dados['cnpj']).first():
            return jsonify(mensagem="CNPJ já cadastrado"), 409
        if Empresa.query.filter_by(email=dados['email']).first():
            return jsonify(mensagem="Email já cadastrado"), 409

        # CORREÇÃO AQUI: Passando as coordenadas recebidas do JSON para o construtor
        nova_empresa = Empresa(
            nome=dados['nome'],
            cnpj=dados['cnpj'],
            email=dados['email'],
            telefone=dados.get('telefone'),
            descricao=dados.get('descricao'),
            latitude=dados.get('latitude'),    # 👈 Captura do JSON
            longitude=dados.get('longitude')   # 👈 Captura do JSON
        )
        db.session.add(nova_empresa)
        db.session.commit()
        return jsonify(mensagem="Empresa criada com sucesso!", empresa=nova_empresa.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro ao criar empresa", detalhe=str(e)), 500
    
@empresa_bp.route('/empresas/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_empresa(id):
    try:
        dados = request.get_json()
        empresa = Empresa.query.get(id)
        if not empresa:
            return jsonify(mensagem="Empresa não encontrada"), 404

        empresa.nome      = dados.get('nome',      empresa.nome)
        empresa.email     = dados.get('email',     empresa.email)
        empresa.telefone  = dados.get('telefone',  empresa.telefone)
        empresa.descricao = dados.get('descricao', empresa.descricao)
        empresa.ativa     = dados.get('ativa',     empresa.ativa)
        
        # CORREÇÃO AQUI: Atualiza as coordenadas se vierem no JSON, senão mantém as atuais
        empresa.latitude  = dados.get('latitude',  empresa.latitude)
        empresa.longitude = dados.get('longitude', empresa.longitude)

        db.session.commit()
        return jsonify(mensagem="Empresa atualizada com sucesso!", empresa=empresa.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro ao atualizar empresa", detalhe=str(e)), 500

@empresa_bp.route('/empresas/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_empresa(id):
    try:
        empresa = Empresa.query.get(id)
        if not empresa:
            return jsonify(mensagem="Empresa não encontrada"), 404

        db.session.delete(empresa)
        db.session.commit()
        return jsonify(mensagem="Empresa deletada com sucesso!"), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro ao deletar empresa", detalhe=str(e)), 500