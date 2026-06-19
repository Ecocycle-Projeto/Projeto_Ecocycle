# routes/condominio.py

from flask import Blueprint, jsonify, request
from models.condominio import Condominio
from models.pontos_coleta import Ponto_Coleta
from models.usuario import Usuario
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import db

condominio_bp = Blueprint("Condominio", __name__)

@condominio_bp.route('/condominios', methods=['GET'])
@jwt_required()
def get_condominios():
    condominios = Condominio.query.all()
    return jsonify(mensagem="Condomínios obtidos com sucesso!", condominios=[c.to_dict() for c in condominios]), 200

@condominio_bp.route('/condominios/<int:id>', methods=['GET'])
@jwt_required()
def get_condominio(id):
    try:
        condominio = Condominio.query.get(id)
        if not condominio:
            return jsonify(mensagem="Condomínio não encontrado"), 404
        return jsonify(condominio=condominio.to_dict()), 200
    except Exception as e:
        return jsonify(erro=str(e)), 500

@condominio_bp.route('/condominios', methods=['POST'])
@jwt_required()
def criar_condominio():
    try:
        # 🎯 CORREÇÃO: Garante o ID do usuário como inteiro para salvar no banco
        usuario_id = int(get_jwt_identity())
        dados = request.get_json()

        # Primeiro cria o ponto de coleta no mapa
        ponto = Ponto_Coleta(
            nome=dados['nome'],
            endereco=dados['endereco'],
            horario_funcionamento=dados.get('horario_funcionamento', 'Consultar'),
            descricao=dados.get('descricao'),
            latitude=dados['latitude'],
            longitude=dados['longitude'],
            usuario_id=usuario_id
        )
        db.session.add(ponto)
        db.session.flush()  # gera o id do ponto sem commitar ainda

        # Depois cria o condomínio passando o id_usuario exigido pelo construtor (__init__)
        novo_condominio = Condominio(
            nome=dados['nome'],
            responsavel=dados['responsavel'],
            id_ponto_coleta=ponto.id,
            id_usuario=usuario_id,  # 🎯 O PARAMÊTRO QUE FALTAVA AQUI!
            cnpj=dados.get('cnpj') if dados.get('cnpj') else None,
            telefone=dados.get('telefone')
        )
        db.session.add(novo_condominio)
        db.session.commit()

        return jsonify(mensagem="Condomínio criado com sucesso!", condominio=novo_condominio.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        print("❌ ERRO NO POST DE CONDOMÍNIO:", str(e)) # Ajuda a ver no terminal se algo mais falhar
        return jsonify(erro="Erro ao criar condomínio", detalhe=str(e)), 500

@condominio_bp.route('/condominios/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_condominio(id):
    try:
        usuario_id = int(get_jwt_identity())
        usuario_atual = Usuario.query.get(usuario_id)

        dados = request.get_json()
        condominio = Condominio.query.get(id)

        if not condominio:
            return jsonify(mensagem="Condomínio não encontrado"), 404
        
        # 🛡️ TRAVA ATUALIZADA: Valida direto pela tabela de condomínios
        if condominio.id_usuario != usuario_id and usuario_atual.role != 'admin':
            return jsonify(mensagem="Ação não autorizada. Este condomínio não pertence a você."), 403

        condominio.nome        = dados.get('nome',        condominio.nome)
        condominio.responsavel = dados.get('responsavel', condominio.responsavel)
        condominio.cnpj        = dados.get('cnpj',        condominio.cnpj)
        condominio.telefone    = dados.get('telefone',    condominio.telefone)

        ponto = condominio.ponto_coleta
        if ponto:
            ponto.nome                 = dados.get('nome',                 ponto.nome)
            ponto.endereco             = dados.get('endereco',             ponto.endereco)
            ponto.horario_funcionamento = dados.get('horario_funcionamento', ponto.horario_funcionamento)
            ponto.descricao            = dados.get('descricao',            ponto.descricao)

        db.session.commit()
        return jsonify(mensagem="Condomínio atualizado com sucesso!", condominio=condominio.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro ao atualizar condomínio", detalhe=str(e)), 500

@condominio_bp.route('/condominios/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_condominio(id):
    try:
        usuario_id = int(get_jwt_identity())
        usuario_atual = Usuario.query.get(usuario_id)

        condominio = Condominio.query.get(id)
        if not condominio:
            return jsonify(mensagem="Condomínio não encontrado"), 404

        # 🛡️ TRAVA ATUALIZADA: Valida direto pela tabela de condomínios
        if condominio.id_usuario != usuario_id and usuario_atual.role != 'admin':
            return jsonify(mensagem="Ação não autorizada. Este condomínio não pertence a você."), 403

        ponto = condominio.ponto_coleta

        # Remove o condomínio primeiro por causa da FK
        db.session.delete(condominio)
        db.session.flush()

        # Depois remove o ponto de coleta vinculado
        if ponto:
            db.session.delete(ponto)
            
        db.session.commit()

        return jsonify(mensagem="Condomínio deletado com sucesso!"), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro ao deletar condomínio", detalhe=str(e)), 500