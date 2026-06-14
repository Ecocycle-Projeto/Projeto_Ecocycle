# models/favorito.py

from db import db

class Favorito(db.Model):
    __tablename__ = 'favoritos'

    id          = db.Column(db.Integer, primary_key=True)
    id_usuario  = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    id_servico  = db.Column(db.Integer, db.ForeignKey('servicos.id'), nullable=False)

    usuario = db.relationship('Usuario', backref=db.backref('favoritos', lazy=True))
    servico = db.relationship('Servico', backref=db.backref('favoritos', lazy=True))

    def to_dict(self):
        return {
            'id':         self.id,
            'id_usuario': self.id_usuario,
            'id_servico': self.id_servico,
            'servico':    self.servico.to_dict()
        }