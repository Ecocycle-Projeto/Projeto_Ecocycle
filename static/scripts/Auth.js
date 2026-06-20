class Auth {
    static async login(email, senha) {
        try {
            const response = await fetch('https://ecomap-wshs.onrender.com/auth/login', {
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
            const response = await fetch('https://ecomap-wshs.onrender.com/usuario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha })
            });
            return await response.json();
        } catch (error) {
            return { success: false, message: "Erro na conexão com o servidor" };
        }
    }

    static async recuperarSenha(email, recaptchaToken) {
        try {
            const response = await fetch('https://ecomap-wshs.onrender.com/auth/recuperar_senha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, 'g-recaptcha-response': recaptchaToken })
            });
            return await response.json();
        } catch (error) {
            return { success: false, message: "Erro na conexão com o servidor" };
        }
    }

    static async redefinirSenha(token, novaSenha) {
        try {
            const response = await fetch('https://ecomap-wshs.onrender.com/auth/redefinir_senha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, nova_senha: novaSenha })
            });
            return await response.json();
        } catch (error) {
            return { success: false, message: "Erro na conexão com o servidor" };
        }
    }
}