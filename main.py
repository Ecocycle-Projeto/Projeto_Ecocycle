from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta   
from dotenv import load_dotenv
from db import db
import os

from routes.usuario import usuario_bp
from routes.auth import auth_bp
from routes.templates import template
from routes.ponto_coleta import ponto_coleta_bp

# Carregar variáveis do .env
load_dotenv()

# Configuração da aplicação Flask
app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "http://127.0.0.1:5000"}})
app.config['JSON_SORT_KEYS'] = False
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=15)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL")
db.init_app(app)
jwt = JWTManager(app)

# Blueprints das rotas
app.register_blueprint(usuario_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(template)
app.register_blueprint(ponto_coleta_bp)

# Arquivo principal
if __name__ == '__main__':
    app.run(debug=True)


