from db import db
from datetime import datetime

class Usuario(db.Model):
    __tablename__ = 'usuarios'

    id          = db.Column(db.Integer, primary_key=True)
    nome        = db.Column(db.String(100), nullable=False)
    email       = db.Column(db.String(100), unique=True, nullable=False)
    senha       = db.Column(db.String(200), nullable=False)
    termos      = db.Column(db.Boolean, default=False, nullable=False)
    data_aceito = db.Column(db.DateTime, default=None)
    role        = db.Column(db.String(20), nullable=False, default='usuario')
    # Valores possíveis: 'usuario', 'empresa', 'admin'

    def __init__(self, nome, email, senha, termos, data_aceito, role='usuario'):
        self.nome        = nome
        self.email       = email
        self.senha       = senha
        self.termos      = termos
        self.data_aceito = data_aceito
        self.role        = role

    def to_dict(self):
        return {
            'id':    self.id,
            'nome':  self.nome,
            'email': self.email,
            'termos': self.termos,
            'data':  self.data_aceito,
            'role':  self.role
        }