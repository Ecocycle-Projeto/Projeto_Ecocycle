from flask import Blueprint, jsonify, request
from models.pontos_coleta import Ponto_Coleta
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import db



# Criação do Blueprint
ponto_coleta_bp = Blueprint("Ponto de Coleta", __name__)


@ponto_coleta_bp.route('/pontos_coleta', methods=['GET'])
@jwt_required()
def get_pontos_coleta():
    pontos = Ponto_Coleta.query.all()
    ponto = [i.to_dict() for i in pontos]
    return jsonify(mensagem = "Pontos de Coleta obtidos com sucesso!", pontos = ponto), 200

@ponto_coleta_bp.route('/pontos_coleta/<int:id>', methods=['GET'])
@jwt_required()
def filtrar_ponto_coleta(id):
    try:
        ponto = Ponto_Coleta.query.get(id)
        if ponto:
            ponto_dict = ponto.to_dict()
            return jsonify(ponto=ponto_dict), 200
        else:
            return jsonify(mensagem="Ponto de Coleta não encontrado"), 404
    except Exception as e:
        return jsonify(erro=str(e)), 500
    
@ponto_coleta_bp.route('/pontos_coleta', methods=['POST'])
@jwt_required()
def criar_ponto_coleta():
    try:
        usuario_id = get_jwt_identity()
        dados = request.get_json()

        novo_ponto = Ponto_Coleta(
            nome=dados['nome'],
            endereco=dados['endereco'],
            horario_funcionamento=dados['horario_funcionamento'],
            descricao=dados.get('descricao'),
            usuario_id=usuario_id
        )

        db.session.add(novo_ponto)
        db.session.commit()

        return jsonify(mensagem="Ponto de Coleta criado com sucesso!", ponto=novo_ponto.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro ao criar Ponto de Coleta", detalhe=str(e)), 500
    

@ponto_coleta_bp.route('/pontos_coleta/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_pontos_coleta(id):
    try:
        usuario_id = int(get_jwt_identity())
        dados = request.get_json()
        ponto = Ponto_Coleta.query.get(id)
        if not ponto:
            return jsonify(mensagem="Ponto de Coleta não encontrado"), 404
        if ponto.id_usuario != usuario_id:
            return jsonify(mensagem="Ação não autorizada"), 403
        
        ponto.nome = dados.get('nome', ponto.nome)
        ponto.endereco = dados.get('endereco', ponto.endereco)
        ponto.horario_funcionamento = dados.get('horario_funcionamento', ponto.horario_funcionamento)
        ponto.descricao = dados.get('descricao', ponto.descricao)
        db.session.commit()
        return jsonify(mensagem="Ponto de Coleta atualizado com sucesso!", ponto=ponto.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro ao atualizar Ponto de Coleta", detalhe=str(e)), 500
    
@ponto_coleta_bp.route('/pontos_coleta/<int:id>', methods=['DELETE'])
@jwt_required()
def deletar_ponto_coleta(id):
    try:
        usuario_id = int(get_jwt_identity())
        ponto = Ponto_Coleta.query.get(id)
        if not ponto:
            return jsonify(mensagem="Ponto de Coleta não encontrado"), 404
        if ponto.id_usuario != usuario_id:
            return jsonify(mensagem="Ação não autorizada"), 403
        
        db.session.delete(ponto)
        db.session.commit()
        return jsonify(mensagem="Ponto de Coleta deletado com sucesso!"), 200
    except Exception as e:
        db.session.rollback()
        return jsonify(erro="Erro ao deletar Ponto de Coleta", detalhe=str(e)), 500