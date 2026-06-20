# routes/servicos.py

from flask import Blueprint, jsonify, request
from models.servicos import Servico
from models.empresa import Empresa
from models.usuario import Usuario
from flask_jwt_extended import jwt_required, get_jwt_identity
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
        usuario_id = int(get_jwt_identity())
        usuario_atual = Usuario.query.get(usuario_id)
        dados = request.get_json()

        novo_servico = Servico(
            nome=dados['nome'],
            descricao=dados.get('descricao')
        )

        # SE O FRONTEND ENVIAR IDS (Para compatibilidade geral)
        ids_empresas = dados.get('ids_empresas', [])
        
        if ids_empresas:
            if usuario_atual.role == 'admin':
                empresas = Empresa.query.filter(Empresa.id.in_(ids_empresas)).all()
            else:
                empresas = Empresa.query.filter(Empresa.id.in_(ids_empresas), Empresa.id_usuario == usuario_id).all()
                if len(empresas) != len(ids_empresas):
                    return jsonify(mensagem="Ação não autorizada. Uma ou mais empresas fornecidas não pertencem a você."), 403
            novo_servico.empresas = empresas
            
        else:
            # CORREÇÃO: Se não vierem IDs no JSON, busca AUTOMATICAMENTE as empresas do usuário logado!
            if usuario_atual.role != 'admin':
                empresas_automaticas = Empresa.query.filter_by(id_usuario=usuario_id).all()
                novo_servico.empresas = empresas_automaticas

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
        usuario_id = int(get_jwt_identity())
        usuario_atual = Usuario.query.get(usuario_id)
        dados = request.get_json()
        
        servico = Servico.query.get(id)
        if not servico:
            return jsonify(mensagem="Serviço não encontrado"), 404

        servico.nome      = dados.get('nome',      servico.nome)
        servico.descricao = dados.get('descricao', servico.descricao)
        servico.ativo     = dados.get('ativo',     servico.ativo)

        ids_empresas = dados.get('ids_empresas')
        if ids_empresas is not None:

            if usuario_atual.role == 'admin':
                empresas = Empresa.query.filter(Empresa.id.in_(ids_empresas)).all()
            else:
                empresas = Empresa.query.filter(Empresa.id.in_(ids_empresas), Empresa.id_usuario == usuario_id).all()
                if len(empresas) != len(ids_empresas):
                    return jsonify(mensagem="Ação não autorizada. Uma ou mais empresas fornecidas não pertencem a você."), 403
            
            servico.empresas = empresas

        db.session.commit()
        return jsonify(mensagem="Serviço updated com sucesso!", servico=servico.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro ao atualizar serviço", detalhe=str(e)), 500

@servico_bp.route('/servicos/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_servico(id):
    try:
        usuario_id = int(get_jwt_identity())
        usuario_atual = Usuario.query.get(usuario_id)
        
        servico = Servico.query.get(id)
        if not servico:
            return jsonify(mensagem="Serviço não encontrado"), 404

        se_empresas_de_outros = [e for e in servico.empresas if e.id_usuario != usuario_id]
        if se_empresas_de_outros and usuario_atual.role != 'admin':
            return jsonify(mensagem="Ação não autorizada. Este serviço está associado a empresas de outros usuários."), 403

        db.session.delete(servico)
        db.session.commit()
        return jsonify(mensagem="Serviço deletado com sucesso!"), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro ao deletar serviço", detalhe=str(e)), 500