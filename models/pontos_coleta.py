from db import db


class Ponto_Coleta(db.Model):
    __tablename__ = 'pontos_de_coleta'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    endereco = db.Column(db.String(200), nullable=False)
    horario_funcionamento = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.String(300), nullable=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    latitude = db.Column(db.Numeric(precision=9, scale=6), nullable=False)
    longitude = db.Column(db.Numeric(precision=9, scale=6), nullable=False)
    percentual_atual = db.Column(db.Integer, default=0)
    id_empresa = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)

    usuario = db.relationship('Usuario', backref=db.backref('pontos_coleta', lazy=True))

    def __init__(self, nome, endereco, horario_funcionamento, descricao, usuario_id, latitude, longitude, percentual_atual=0):
        self.nome = nome
        self.endereco = endereco
        self.horario_funcionamento = horario_funcionamento
        self.descricao = descricao
        self.id_usuario = usuario_id
        self.latitude = latitude
        self.longitude = longitude
        self.percentual_atual = percentual_atual

    

    def to_dict(self):
        
        return {
            'id': self.id,
            'nome': self.nome,
            'endereco': self.endereco,
            'horario_funcionamento': self.horario_funcionamento,
            'descricao': self.descricao,
            'latitude': float(self.latitude),
            'longitude': float(self.longitude),
            'usuario_id': self.id_usuario,
            'percentual_atual': self.percentual_atual,
        }
    