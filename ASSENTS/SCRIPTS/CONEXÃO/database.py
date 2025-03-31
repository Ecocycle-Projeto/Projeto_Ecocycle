import psycopg2

def get_connection():
    return psycopg2.connect(
        host="localhost",
        database="postgres",
        user="postgres",
        password="12345678",
        port="5432"
    )