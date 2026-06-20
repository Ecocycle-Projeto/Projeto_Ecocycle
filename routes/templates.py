from flask import Blueprint, render_template

from models.pontos_coleta import Ponto_Coleta
from models.usuario import Usuario
from models.empresa import Empresa
from models.condominio import Condominio

template = Blueprint('template', __name__)

# Rotas para renderizar templates HTML
@template.route('/')
def index():
    return render_template('index.html')

@template.route('/login.html')
def login():
    return render_template('login.html')

@template.route("/cadastro.html")
def cadastro():
    return render_template("cadastro.html")

@template.route("/ecomap.html")
def ecomap():
    return render_template("ecomap.html")

@template.route("/admin_pontos.html")
def admin_pontos():
    pontos = Ponto_Coleta.query.all()
    return render_template("admin_ponto.html", pontos=pontos)

@template.route("/admin_user.html")
def admin_user():
    usuarios = Usuario.query.all()
    return render_template("admin_user.html", usuarios=usuarios)

@template.route("/admin_empresa.html")
def admin_empresa():
    empresas = Empresa.query.all()
    return render_template("admin_empresa.html", empresas=empresas )

@template.route("/admin_condominios.html")
def admin_condominios():
    condominios = Condominio.query.all()
    return render_template("admin_condominios.html", condominios=condominios)

@template.route('/recuperar_senha.html')
def recuperar_senha_page():
    return render_template('recuperar_senha.html') 

@template.route('/redefinir_senha.html')
def redefinir_senha_page():
    return render_template('redefinir_senha.html')
