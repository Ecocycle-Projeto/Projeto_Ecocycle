// ASSENTS/SCRIPTS/REGISTRO/cadastro.js
document.addEventListener('DOMContentLoaded', () => {
    const formCadastro = document.querySelector('.formulario-cadastro');
    
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('password').value;
        const recaptchaToken = grecaptcha.getResponse();
        
        
        // Validações
        if (!nome || !email || !senha) {
            alert('Por favor, preencha todos os campos');
            return;
        }
        
        if (!recaptchaToken) {
            alert('Por favor, prove que você não é um robô (marque o reCAPTCHA).');
            return;
        }

        if (senha.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            alert('Por favor, insira um email válido');
            return;
        }
        
        const botaoCadastro = document.querySelector('.botao-cadastro');
        botaoCadastro.disabled = true;
        botaoCadastro.textContent = 'Registrando...';
        
        try {
            // Chamada HTTP para a API Flask
            const response = await fetch('http://127.0.0.1:5000/usuario', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nome: nome,
                    email: email,
                    senha: senha,
                    'g-recaptcha-response': recaptchaToken
                })
            });

             if (!response.ok) {
                // Se o reCAPTCHA falhar no back-end, o Google invalida o token.
                grecaptcha.reset(); 
                throw new Error(data.mensagem || 'Erro no login');
            }

            const resultado = await response.json();

            if (!response.ok) {
                throw new Error(resultado.message || 'Erro no cadastro');
            }

            if (resultado.mensagem) {
                alert('Cadastro realizado com sucesso! Faça login para continuar.');
                window.location.href = 'login.html';
            } else {
                alert(resultado.erro || 'Erro no cadastro');
            }
        } catch (error) {
            console.error('Erro:', error);
            if (error.message.includes('Email já cadastrado')) {
                alert('Este email já está em uso. Por favor, use outro.');
            } else {
                alert(error.message || 'Erro ao conectar com o servidor');
            }
        } finally {
            botaoCadastro.disabled = false;
            botaoCadastro.textContent = 'Registrar-se agora';
        }
    });
});