# routes/favorito.py

from flask import Blueprint, jsonify
from models.favorito import Favorito
from models.servicos import Servico
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import db

favorito_bp = Blueprint("Favorito", __name__)

@favorito_bp.route('/favoritos', methods=['GET'])
@jwt_required()
def get_favoritos():
    usuario_id = get_jwt_identity()
    favoritos  = Favorito.query.filter_by(id_usuario=usuario_id).all()
    return jsonify(favoritos=[f.to_dict() for f in favoritos]), 200

@favorito_bp.route('/favoritos/<int:id_servico>', methods=['POST'])
@jwt_required()
def favoritar(id_servico):
    try:
        usuario_id = get_jwt_identity()

        # Verifica se o serviço existe
        servico = Servico.query.get(id_servico)
        if not servico:
            return jsonify(mensagem="Serviço não encontrado"), 404

        # Verifica se já está favoritado
        existente = Favorito.query.filter_by(
            id_usuario=usuario_id,
            id_servico=id_servico
        ).first()
        if existente:
            return jsonify(mensagem="Serviço já favoritado"), 409

        favorito = Favorito(id_usuario=usuario_id, id_servico=id_servico)
        db.session.add(favorito)
        db.session.commit()
        return jsonify(mensagem="Serviço favoritado com sucesso!"), 201

    except Exception as e:
        db.session.rollback()
        return jsonify(erro=str(e)), 500

@favorito_bp.route('/favoritos/<int:id_servico>', methods=['DELETE'])
@jwt_required()
def desfavoritar(id_servico):
    try:
        usuario_id = get_jwt_identity()
        favorito   = Favorito.query.filter_by(
            id_usuario=usuario_id,
            id_servico=id_servico
        ).first()

        if not favorito:
            return jsonify(mensagem="Favorito não encontrado"), 404

        db.session.delete(favorito)
        db.session.commit()
        return jsonify(mensagem="Serviço removido dos favoritos"), 200

    except Exception as e:
        db.session.rollback()
        return jsonify(erro=str(e)), 500