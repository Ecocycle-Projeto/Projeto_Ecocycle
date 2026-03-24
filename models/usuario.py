from db import db

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    senha = db.Column(db.String(200), nullable=False)

    def __init__(self, nome, email, senha):
        self.nome = nome
        self.email = email
        self.senha = senha

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'email': self.email
        }