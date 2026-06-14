# routes/mapa.py

from flask import Blueprint, jsonify
from models.pontos_coleta import Ponto_Coleta
from models.condominio import Condominio
from models.empresa import Empresa

mapa_bp = Blueprint("Mapa", __name__)

@mapa_bp.route('/mapa', methods=['GET'])
def get_dados_mapa():
    try:
        pontos      = Ponto_Coleta.query.all()
        condominios = Condominio.query.all()
        empresas    = Empresa.query.filter(
            Empresa.ativa == True,
            Empresa.latitude  != None,
            Empresa.longitude != None
        ).all()

        return jsonify(
            pontos=[{
                'id':                   p.id,
                'nome':                 p.nome,
                'endereco':             p.endereco,
                'horario_funcionamento': p.horario_funcionamento,
                'descricao':            p.descricao,
                'latitude':             float(p.latitude),
                'longitude':            float(p.longitude),
                'percentual_atual':     p.percentual_atual or 0,
                'usuario_id':           p.id_usuario
            } for p in pontos],
            condominios=[{
                'id':          c.id,
                'nome':        c.nome,
                'responsavel': c.responsavel,
                'telefone':    c.telefone,
                'endereco':    c.ponto_coleta.endereco,
                'latitude':    float(c.ponto_coleta.latitude),
                'longitude':   float(c.ponto_coleta.longitude),
            } for c in condominios],
            empresas=[{
                'id':        e.id,
                'nome':      e.nome,
                'descricao': e.descricao,
                'telefone':  e.telefone,
                'latitude':  float(e.latitude),
                'longitude': float(e.longitude),
            } for e in empresas]
        ), 200

    except Exception as e:
        return jsonify(erro="Erro ao carregar dados do mapa", detalhe=str(e)), 500