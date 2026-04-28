from flask import Blueprint, render_template

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