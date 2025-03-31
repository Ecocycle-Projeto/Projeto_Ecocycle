# backend/main.py
import asyncio
import websockets
import json
import psycopg2
from psycopg2 import OperationalError


DB_CONFIG = {
    "host": "localhost",
    "database": "postgres",
    "user": "postgres",
    "password": "12345678",  
    "port": "5432"
}

class Database:
    @staticmethod
    def get_connection():
        try:
            return psycopg2.connect(**DB_CONFIG)
        except OperationalError as e:
            print(f"Erro ao conectar ao PostgreSQL: {e}")
            return None

    @staticmethod
    def create_tables():
        commands = (
            """
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                senha VARCHAR(100) NOT NULL,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        
        conn = None
        try:
            conn = Database.get_connection()
            if conn:
                cur = conn.cursor()
                for command in commands:
                    cur.execute(command)
                conn.commit()
                cur.close()
                print("Tabelas verificadas/criadas com sucesso")
        except Exception as e:
            print(f"Erro ao criar tabelas: {e}")
        finally:
            if conn:
                conn.close()

async def handle_login(conn, data):
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, nome FROM usuarios WHERE email = %s AND senha = %s",
            (data['email'], data['senha'])
        )
        user = cur.fetchone()
        
        if user:
            return {
                "success": True,
                "user": {
                    "id": user[0],
                    "nome": user[1]
                }
            }
        else:
            return {
                "success": False,
                "message": "E-mail ou senha incorretos"
            }
    finally:
        if 'cur' in locals():
            cur.close()

async def handle_cadastro(conn, data):
    try:
        cur = conn.cursor()
        
        # Verifica se email já existe
        cur.execute("SELECT id FROM usuarios WHERE email = %s", (data['email'],))
        if cur.fetchone():
            return {
                "success": False,
                "message": "Este e-mail já está cadastrado"
            }
        
        # Insere novo usuário
        cur.execute(
            """INSERT INTO usuarios (nome, email, senha) 
            VALUES (%s, %s, %s) RETURNING id, nome""",
            (data['nome'], data['email'], data['senha'])
        )
        user = cur.fetchone()
        conn.commit()
        
        return {
            "success": True,
            "message": "Cadastro realizado com sucesso",
            "user": {
                "id": user[0],
                "nome": user[1]
            }
        }
    finally:
        if 'cur' in locals():
            cur.close()

async def handler(websocket, path):
    print(f"Nova conexão: {websocket.remote_address}")
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                action = data.get("action")
                
                conn = Database.get_connection()
                if not conn:
                    await websocket.send(json.dumps({
                        "success": False,
                        "message": "Erro no servidor de banco de dados"
                    }))
                    continue
                
                try:
                    if action == "login":
                        response = await handle_login(conn, data)
                    elif action == "cadastro":
                        response = await handle_cadastro(conn, data)
                    else:
                        response = {
                            "success": False,
                            "message": "Ação desconhecida"
                        }
                    
                    await websocket.send(json.dumps(response))
                
                finally:
                    if conn:
                        conn.close()
                        
            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    "success": False,
                    "message": "Formato de mensagem inválido"
                }))
            except Exception as e:
                await websocket.send(json.dumps({
                    "success": False,
                    "message": f"Erro interno: {str(e)}"
                }))
                print(f"Erro na mensagem: {e}")
                
    except websockets.exceptions.ConnectionClosed:
        print(f"Conexão fechada: {websocket.remote_address}")
    except Exception as e:
        print(f"Erro na conexão: {e}")

async def main():
    # Garante que as tabelas existam
    Database.create_tables()
    
    # Inicia o servidor WebSocket
    server = await websockets.serve(
        handler,
        "localhost",
        8765,
        ping_interval=None
    )
    
    print("Servidor WebSocket iniciado em ws://localhost:8765")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(main())
    asyncio.get_event_loop().run_forever()