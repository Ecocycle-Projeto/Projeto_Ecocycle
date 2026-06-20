from utils.validar_email import validar_email

def test_email_valido():
    assert validar_email("usuario@ecomap.com") == True

def test_email_invalido():
    assert validar_email("usuario@ecomap") == False

def test_email_vazio():
    assert validar_email("") == False
