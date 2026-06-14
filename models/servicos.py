from db import db

empresa_servico = db.Table('empresa_servico',
    db.Column('id_empresa', db.Integer, db.ForeignKey('empresas.id'), primary_key=True),
    db.Column('id_servico', db.Integer, db.ForeignKey('servicos.id'), primary_key=True)
)

class Servico(db.Model):
    __tablename__ = 'servicos'

    id        = db.Column(db.Integer, primary_key=True)
    nome      = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.String(300), nullable=True)
    ativo     = db.Column(db.Boolean, default=True)

    # Relacionamento com Empresa via tabela intermediária
    empresas = db.relationship('Empresa', secondary='empresa_servico', back_populates='servicos', lazy=True)

    def __init__(self, nome, descricao=None):
        self.nome      = nome
        self.descricao = descricao

    def to_dict(self):
         return {
        'id':        self.id,
        'nome':      self.nome,
        'descricao': self.descricao,
        'ativo':     self.ativo,
        'empresas': [{
            'id':        e.id,
            'nome':      e.nome,
            'telefone':  e.telefone if hasattr(e, 'telefone') else None,
            'latitude':  float(e.latitude)  if e.latitude  else None,
            'longitude': float(e.longitude) if e.longitude else None,
        } for e in self.empresas] if self.empresas else []
    }