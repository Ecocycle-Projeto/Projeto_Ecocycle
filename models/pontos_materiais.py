from db import db


class Ponto_Material(db.Model):
    __tablename__ = 'pontos_materiais'

    id = db.Column(db.Integer, primary_key=True)
    ponto_coleta_id = db.Column(db.Integer, db.ForeignKey('pontos_de_coleta.id'), nullable=False)
    material_id = db.Column(db.Integer, db.ForeignKey('materiais.id'), nullable=False)

    ponto_coleta = db.relationship('Ponto_Coleta', backref=db.backref('pontos_materiais', lazy=True))
    material = db.relationship('Material', backref=db.backref('pontos_materiais', lazy=True))

    def __init__(self, ponto_coleta_id, material_id):
        self.ponto_coleta_id = ponto_coleta_id
        self.material_id = material_id

    def to_dict(self):
        return {
            'id': self.id,
            'ponto_coleta_id': self.ponto_coleta_id,
            'material_id': self.material_id
        }