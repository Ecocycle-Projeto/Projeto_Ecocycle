class Auth {
    static async login(email, senha) {
        try {
            const response = await fetch('http://127.0.0.1:5000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });
            return await response.json();
        } catch (error) {
            return { success: false, message: "Erro na conexão com o servidor" };
        }
    }

    static async cadastrar(nome, email, senha) {
        try {
            const response = await fetch('http://127.0.0.1:5000/usuario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha })
            });
            return await response.json();
        } catch (error) {
            return { success: false, message: "Erro na conexão com o servidor" };
        }
    }
}