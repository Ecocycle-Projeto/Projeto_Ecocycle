# models/condominio.py

from db import db

class Condominio(db.Model):
    __tablename__ = 'condominios'

    id             = db.Column(db.Integer, primary_key=True)
    nome           = db.Column(db.String(100), nullable=False)
    cnpj           = db.Column(db.String(18), unique=True, nullable=True)
    responsavel    = db.Column(db.String(100), nullable=False)
    telefone       = db.Column(db.String(20), nullable=True)

    # Vínculo com o ponto de coleta no mapa
    id_ponto_coleta = db.Column(db.Integer, db.ForeignKey('pontos_de_coleta.id'), nullable=False, unique=True)
    ponto_coleta    = db.relationship('Ponto_Coleta', backref=db.backref('condominio', uselist=False))

    def __init__(self, nome, responsavel, id_ponto_coleta, cnpj=None, telefone=None):
        self.nome            = nome
        self.responsavel     = responsavel
        self.id_ponto_coleta = id_ponto_coleta
        self.cnpj            = cnpj
        self.telefone        = telefone

    def to_dict(self):
        return {
            'id':              self.id,
            'nome':            self.nome,
            'cnpj':            self.cnpj,
            'responsavel':     self.responsavel,
            'telefone':        self.telefone,
            'id_ponto_coleta': self.id_ponto_coleta,
            'latitude':        float(self.ponto_coleta.latitude),
            'longitude':       float(self.ponto_coleta.longitude),
            'endereco':        self.ponto_coleta.endereco
        }