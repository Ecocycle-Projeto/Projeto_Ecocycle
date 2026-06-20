from flask import Blueprint, jsonify, request

from models.pontos_coleta import Ponto_Coleta
from db import db


arduino_bp = Blueprint('arduino',__name__ )

@arduino_bp.route('/iot/atualizar_lixeira', methods=["POST"])
def atualizar_percentual():

    dados = request.get_json()

    if not dados:
        return jsonify(mensagem="Requisição inválida! Json vazio!")
    
    ponto_id = dados.get('ponto_id')
    percentual = dados.get('percentual')

    if ponto_id is None or percentual is None:
        return jsonify(mensagem="Campos 'pontos_id' e 'percentual_atual' são obrigatórios")
    
    ponto = Ponto_Coleta.query.get(ponto_id)
    
    if not ponto:
        return jsonify(mensagem=f"Ponto de coleta com id {ponto_id} não foi encontrado!")
    
    ponto.percentual_atual = max(0, min(100, int(percentual)))

    db.session.commit()

    return jsonify({
        "status": "sucesso",
        "ponto_id": ponto.id,
        "novo_percentual": ponto.percentual_atual
    }), 200