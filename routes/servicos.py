# routes/servicos.py

from flask import Blueprint, jsonify, request
from models.servicos import Servico
from models.empresa import Empresa
from flask_jwt_extended import jwt_required
from db import db

servico_bp = Blueprint("Servico", __name__)

@servico_bp.route('/servicos', methods=['GET'])
@jwt_required()
def get_servicos():
    servicos = Servico.query.all()
    return jsonify(mensagem="Serviços obtidos com sucesso!", servicos=[s.to_dict() for s in servicos]), 200

@servico_bp.route('/servicos/<int:id>', methods=['GET'])
@jwt_required()
def get_servico(id):
    try:
        servico = Servico.query.get(id)
        if not servico:
            return jsonify(mensagem="Serviço não encontrado"), 404
        return jsonify(servico=servico.to_dict()), 200
    except Exception as e:
        return jsonify(erro=str(e)), 500

@servico_bp.route('/servicos', methods=['POST'])
@jwt_required()
def criar_servico():
    try:
        dados = request.get_json()

        novo_servico = Servico(
            nome=dados['nome'],
            descricao=dados.get('descricao')
        )

        # Vincula empresas se vier uma lista de ids
        ids_empresas = dados.get('ids_empresas', [])
        if ids_empresas:
            empresas = Empresa.query.filter(Empresa.id.in_(ids_empresas)).all()
            novo_servico.empresas = empresas

        db.session.add(novo_servico)
        db.session.commit()
        return jsonify(mensagem="Serviço criado com sucesso!", servico=novo_servico.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro ao criar serviço", detalhe=str(e)), 500

@servico_bp.route('/servicos/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_servico(id):
    try:
        dados = request.get_json()
        servico = Servico.query.get(id)
        if not servico:
            return jsonify(mensagem="Serviço não encontrado"), 404

        servico.nome      = dados.get('nome',      servico.nome)
        servico.descricao = dados.get('descricao', servico.descricao)
        servico.ativo     = dados.get('ativo',     servico.ativo)

        # Atualiza empresas vinculadas se vier nova lista
        ids_empresas = dados.get('ids_empresas')
        if ids_empresas is not None:
            empresas = Empresa.query.filter(Empresa.id.in_(ids_empresas)).all()
            servico.empresas = empresas

        db.session.commit()
        return jsonify(mensagem="Serviço atualizado com sucesso!", servico=servico.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro ao atualizar serviço", detalhe=str(e)), 500

@servico_bp.route('/servicos/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_servico(id):
    try:
        servico = Servico.query.get(id)
        if not servico:
            return jsonify(mensagem="Serviço não encontrado"), 404

        db.session.delete(servico)
        db.session.commit()
        return jsonify(mensagem="Serviço deletado com sucesso!"), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro ao deletar serviço", detalhe=str(e)), 500