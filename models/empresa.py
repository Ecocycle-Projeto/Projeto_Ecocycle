# models/empresa.py

from db import db

class Empresa(db.Model):
    __tablename__ = 'empresas'

    id        = db.Column(db.Integer, primary_key=True)
    nome      = db.Column(db.String(100), nullable=False)
    cnpj      = db.Column(db.String(18), unique=True, nullable=False)
    email     = db.Column(db.String(120), unique=True, nullable=False)
    telefone  = db.Column(db.String(20), nullable=True)
    descricao = db.Column(db.String(300), nullable=True)
    ativa     = db.Column(db.Boolean, default=True)
    latitude  = db.Column(db.Numeric(precision=9, scale=6), nullable=True)
    longitude = db.Column(db.Numeric(precision=9, scale=6), nullable=True)


    id_usuario = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=True)

 
    pontos_coleta = db.relationship('Ponto_Coleta', backref='empresa', lazy=True)
    servicos      = db.relationship('Servico', secondary='empresa_servico', back_populates='empresas', lazy=True)

    
    def __init__(self, nome, cnpj, email, telefone=None, descricao=None, ativa=True, latitude=None, longitude=None, id_usuario=None):
        self.nome      = nome
        self.cnpj      = cnpj
        self.email     = email
        self.telefone  = telefone
        self.descricao = descricao
        self.ativa     = ativa
        self.latitude  = latitude
        self.longitude = longitude
        self.id_usuario = id_usuario

    def to_dict(self):
        return {
            'id':        self.id,
            'nome':      self.nome,
            'cnpj':      self.cnpj,
            'email':     self.email,
            'telefone':  self.telefone,
            'descricao': self.descricao,
            'ativa':     self.ativa,
            'latitude':  float(self.latitude)  if self.latitude  else None,
            'longitude': float(self.longitude) if self.longitude else None,
            'id_usuario': self.id_usuario
        }