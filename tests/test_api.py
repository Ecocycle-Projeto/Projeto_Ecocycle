import pytest
import json
from main import app, db_connection
from werkzeug.security import generate_password_hash
from psycopg2.errors import UniqueViolation, InFailedSqlTransaction


# -----------------
# Fixtures
# -----------------

# Esta fixture irá garantir que cada teste tenha sua própria transação
# e que ela seja revertida no final, limpando o banco de dados.
# Isso isola os testes e resolve o problema de estado do banco.
@pytest.fixture(autouse=True)
def db_transaction():
    try:
        # Inicia a transação
        db_connection.autocommit = False
        yield
    finally:
        # Reverte a transação, desfazendo todas as alterações do teste
        db_connection.rollback()
        db_connection.autocommit = True


# Fixture para criar um cliente de teste do Flask
@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


# Fixture para criar um usuário de teste no banco de dados
@pytest.fixture
def setup_test_user():
    cursor = db_connection.cursor()
    
    # Insere um usuário de teste
    senha_hash = generate_password_hash("senha123", method='pbkdf2:sha256')
    sql = "INSERT INTO usuarios (nome, email, senha) VALUES (%s, %s, %s)"
    cursor.execute(sql, ("Usuário de Teste", "teste_usuario@email.com", senha_hash))
    
    # Retorna o ID do usuário inserido para uso nos testes
    cursor.execute("SELECT id FROM usuarios WHERE email = %s", ("teste_usuario@email.com",))
    user_id = cursor.fetchone()[0]
    
    yield user_id
    
    cursor.close()


# -----------------
# Testes da Rota GET /usuario/<id>
# -----------------

def test_filtrar_usuario_com_sucesso(client, setup_test_user):
    """Testa a rota GET /usuario/<id> com um ID válido."""
    user_id = setup_test_user
    response = client.get(f'/usuario/{user_id}')
    data = json.loads(response.data)
    
    assert response.status_code == 200
    assert 'usuario' in data
    assert data['usuario']['id'] == user_id
    assert data['usuario']['nome'] == "Usuário de Teste"
    assert data['usuario']['email'] == "teste_usuario@email.com"


def test_filtrar_usuario_nao_encontrado(client):
    """Testa a rota GET /usuario/<id> com um ID que não existe."""
    response = client.get('/usuario/99999')
    data = json.loads(response.data)
    
    assert response.status_code == 404
    assert 'mensagem' in data
    assert data['mensagem'] == "Usuário não encontrado"


# -----------------
# Testes da Rota POST /usuario
# -----------------

def test_criar_usuario_com_sucesso(client):
    """Testa a rota POST /usuario com dados válidos."""
    novo_usuario = {
        "nome": "Novo Usuário",
        "email": "novo_usuario@email.com",
        "senha": "senha_segura"
    }
    response = client.post(
        '/usuario',
        data=json.dumps(novo_usuario),
        content_type='application/json'
    )
    data = json.loads(response.data)
    
    assert response.status_code == 201
    assert 'mensagem' in data
    assert data['mensagem'] == "Usuário criado com sucesso"

    # Verificação adicional no banco de dados para garantir que foi criado
    cursor = db_connection.cursor()
    cursor.execute("SELECT nome, email FROM usuarios WHERE email = %s", ("novo_usuario@email.com",))
    usuario_criado = cursor.fetchone()
    cursor.close()
    
    assert usuario_criado is not None
    assert usuario_criado[0] == "Novo Usuário"
    assert usuario_criado[1] == "novo_usuario@email.com"


def test_criar_usuario_com_email_existente(client):
    """Testa a rota POST /usuario com um email já cadastrado."""
    
    cursor = db_connection.cursor()
    senha_hash = generate_password_hash("teste123", method='pbkdf2:sha256')
    
    # Criamos o usuário que irá causar a duplicação
    cursor.execute("INSERT INTO usuarios (nome, email, senha) VALUES (%s, %s, %s)", ("Usuário Existente", "existente@email.com", senha_hash))

    usuario_duplicado = {
        "nome": "Usuário Duplicado",
        "email": "existente@email.com",
        "senha": "outra_senha"
    }
    
    response = client.post(
        '/usuario',
        data=json.dumps(usuario_duplicado),
        content_type='application/json'
    )
    data = json.loads(response.data)
    
    # Asserts para verificar se a API retornou o erro esperado
    assert response.status_code == 500
    assert 'erro' in data
    
    cursor.close()
