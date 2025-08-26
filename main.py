from flask import Flask, render_template, jsonify, request
import psycopg2
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS

db_connection = psycopg2.connect(
    host="localhost",
    database="postgres",
    user="postgres",
    password="12345678",
    port="5432"
)

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "http://127.0.0.1:5000"}})

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login.html')
def login():
    return render_template('login.html')

@app.route("/cadastro.html")
def cadastro():
    return render_template("cadastro.html")

@app.route("/Ecomap.html")
def ecomap():
    return render_template("Ecomap.html")

@app.route('/auth/login', methods=['POST'])
def autenticar():
    try:
        email = request.json.get('email')
        senha = request.json.get('senha')

        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM usuarios WHERE email = %s", (email,))
        usuario = cursor.fetchone()

        if usuario and check_password_hash(usuario[3], senha):
            return jsonify(mensagem="Login realizado com sucesso")
        else:
            return jsonify(mensagem="Email ou senha inválidos"), 401

    except Exception as e:
        db_connection.rollback()
        return jsonify(erro="Erro interno no servidor", detalhe=str(e)), 500

@app.route('/usuario', methods=['GET'])
def get_usuários():
    cursor = db_connection.cursor()
    cursor.execute("SELECT id, nome, email FROM usuarios")
    usuarios = cursor.fetchall()
    
    usuario = list()
    for u in usuarios:
        usuario.append({
            'id': u[0],            'nome': u[1],
            'email': u[2]
        })
        
    cursor.close()
    return jsonify(mensagem="Usuários obtidos com sucesso", usuarios=usuario)

@app.route('/usuario/<int:id>', methods=['GET']) 
def filtrar_usuario(id):

    try:
        cursor = db_connection.cursor()
        
        sql = "SELECT id, nome, email FROM usuarios WHERE id = %s"
        cursor.execute(sql, (id,)) 
        
        usuario = cursor.fetchone()  
        
        if usuario:
            usuario_dict = {
                "id": usuario[0],
                "nome": usuario[1],
                "email": usuario[2]
            }
            return jsonify(usuario=usuario_dict), 200
        else:
            return jsonify(mensagem="Usuário não encontrado"), 404
            
    except Exception as e:
        return jsonify(erro=str(e)), 500
    finally:
        cursor.close()  

@app.route('/usuario', methods=['POST'])
def criar_usuario():
    try:
        cursor = db_connection.cursor()
        data = request.get_json()

        senha_hash = generate_password_hash(data['senha'], method='pbkdf2:sha256')

        sql = "INSERT INTO usuarios (nome, email, senha) VALUES (%s, %s, %s)"
        cursor.execute(sql, (data['nome'], data['email'], senha_hash))
        
        db_connection.commit()

        return jsonify(mensagem="Usuário criado com sucesso"), 201
    except Exception as e:
        return jsonify(erro=str(e)), 500
    finally:
        cursor.close()


@app.route('/usuario/<int:id>', methods=['PUT'])
def atualizar_usuario(id):
    try:
        cursor = db_connection.cursor()
        data = request.get_json()
        
        senha_hash = generate_password_hash(data['senha'], method='pbkdf2:sha256')
        sql = "UPDATE usuarios SET nome = %s, email = %s, senha = %s WHERE id = %s"
        cursor.execute(sql, (data['nome'], data['email'], senha_hash, id))
        
        db_connection.commit()

        return jsonify(mensagem="Usuário atualizado com sucesso"), 200
    except Exception as e:
        return jsonify(erro=str(e)), 500
    finally:
        cursor.close()


@app.route('/usuario/<int:id>', methods=['DELETE'])
def deletar_usuario(id):
    try:
        cursor = db_connection.cursor()

        sql = "DELETE FROM usuarios WHERE id = %s"
        cursor.execute(sql, (id,))
        
        db_connection.commit()
        if cursor.rowcount == 0:
            return jsonify(mensagem="Usuário nao encontrado"), 404
        return jsonify(mensagem="Usuário deletado com sucesso"), 200
    except Exception as e:
        return jsonify(erro=str(e)), 500
    finally:
        cursor.close()


if __name__ == '__main__':
    app.run(debug=True)


