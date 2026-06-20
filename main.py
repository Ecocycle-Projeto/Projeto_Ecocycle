from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta   
from dotenv import load_dotenv
from db import db
from flask_migrate import Migrate
import os


from routes.usuario import usuario_bp
from routes.auth import auth_bp
from routes.templates import template
from routes.ponto_coleta import ponto_coleta_bp
from routes.arduino import arduino_bp
from routes.empresa import empresa_bp
from routes.servicos import servico_bp
from routes.condominio import condominio_bp
from routes.mapa import mapa_bp
from routes.favorito import favorito_bp
from routes.chatbot import chatbot_bp

# Carregar variáveis do .env
load_dotenv()

# Configuração da aplicação Flask
app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})
app.config["JSON_SORT_KEYS"] = False
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=15)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=7)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["RECAPTCHA_SITE_KEY"] = os.getenv('RECAPTCHA_SITE_KEY')
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["MAIL_SERVER"] = os.getenv("MAIL_SERVER")
mail_port_env = os.getenv("MAIL_PORT")
app.config["MAIL_PORT"] = int(mail_port_env) if mail_port_env else 587
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
db.init_app(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)

# Blueprints das rotas
app.register_blueprint(usuario_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(template)
app.register_blueprint(ponto_coleta_bp)
app.register_blueprint(arduino_bp)
app.register_blueprint(empresa_bp)
app.register_blueprint(servico_bp)
app.register_blueprint(condominio_bp)
app.register_blueprint(mapa_bp)
app.register_blueprint(favorito_bp)
app.register_blueprint(chatbot_bp)
# Arquivo principal
if __name__ == '__main__':
    app.run(debug=True)


