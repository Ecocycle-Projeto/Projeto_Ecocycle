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
                'latitude':             float(p.latitude) if p.latitude else 0.0,
                'longitude':            float(p.longitude) if p.longitude else 0.0,
                'percentual_atual':     p.percentual_atual or 0,
                'usuario_id':           p.id_usuario
            } for p in pontos],
            
            condominios=[{
                'id':          c.id,
                'nome':        c.nome,
                'responsavel': c.responsavel,
                'telefone':    c.telefone,
                'endereco':    c.ponto_coleta.endereco if c.ponto_coleta else "Endereço indisponível",
                'latitude':    float(c.ponto_coleta.latitude) if (c.ponto_coleta and c.ponto_coleta.latitude) else 0.0,
                'longitude':   float(c.ponto_coleta.longitude) if (c.ponto_coleta and c.ponto_coleta.longitude) else 0.0,
                # 🎯 CORREÇÃO: Enviando o ID do criador que o front-end estava cobrando no console!
                'id_usuario':  c.id_usuario 
            } for c in condominios],
            
            empresas=[{
                'id':         e.id,
                'nome':       e.nome,
                'descricao':  e.descricao,
                'telefone':   e.telefone,
                'latitude':   float(e.latitude) if e.latitude else 0.0,
                'longitude':  float(e.longitude) if e.longitude else 0.0,
                'id_usuario': e.id_usuario,
                # 🎯 NOVIDADE: Mapeia os serviços ativos vinculados a esta empresa
                'servicos': [{
                    'id':        s.id,
                    'nome':      s.nome,
                    'descricao': s.descricao
                } for s in e.servicos if s.ativo]
            } for e in empresas]
        ), 200

    except Exception as e:
        print("❌ ERRO NO MAPA:", str(e)) # Dá um print legível no seu terminal do Linux
        return jsonify(erro="Erro ao carregar dados do mapa", detalhe=str(e)), 500