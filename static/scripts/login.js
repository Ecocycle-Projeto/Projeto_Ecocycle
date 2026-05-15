document.addEventListener('DOMContentLoaded', () => {

    
    if (localStorage.getItem('access_token')) {
    
    window.location.href = 'ecomap.html';
    return;
    }

    const formLogin = document.querySelector('.formulario-login');
    
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value.trim();
        const senha = document.getElementById('login-password').value;
        const recaptchaToken = grecaptcha.getResponse();
        
        if (!email || !senha) {
            alert('Preencha todos os campos');
            return;
        }

        if (!recaptchaToken) {
            alert('Por favor, prove que você não é um robô (marque o reCAPTCHA).');
            return;
        }

        const botaoLogin = document.querySelector('.botao-login');
        botaoLogin.disabled = true;
        botaoLogin.textContent = 'Entrando...';

        try {
            const response = await fetch('http://127.0.0.1:5000/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, senha, 'g-recaptcha-response': recaptchaToken }),
            });

            const data = await response.json();

            if (!response.ok) {
                grecaptcha.reset(); 
                throw new Error(data.mensagem || 'Erro no login');
            }

            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                
                if (data.user) {
                    localStorage.setItem('userData', JSON.stringify(data.user));
                }

                alert(data.mensagem);
                
                // Redireciona após um pequeno atraso
                setTimeout(() => {
                    window.location.href = 'ecomap.html';
                }, 500);

            } else {
                throw new Error('Token de acesso não encontrado na resposta.');
            }

        } catch (error) {
            console.error('Erro:', error);
            alert(error.message || 'Erro ao fazer login');
        } finally {
            botaoLogin.disabled = false;
            botaoLogin.textContent = 'Entrar';
        }
    });
});