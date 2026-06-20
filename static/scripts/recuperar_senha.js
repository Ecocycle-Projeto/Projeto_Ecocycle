document.addEventListener('DOMContentLoaded', () => {
    const formRecuperar = document.querySelector('.formulario-login');
    
    formRecuperar.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('recovery-email').value.trim();
        const recaptchaToken = grecaptcha.getResponse();
        
        if (!email) {
            alert('Preencha o campo de e-mail.');
            return;
        }

        if (!recaptchaToken) {
            alert('Por favor, prove que você não é um robô (marque o reCAPTCHA).');
            return;
        }

        const botaoLogin = document.querySelector('.botao-login');
        botaoLogin.disabled = true;
        botaoLogin.textContent = 'Enviando...';

        try {
            const response = await fetch('http://127.0.0.1:5000/auth/recuperar_senha', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, 'g-recaptcha-response': recaptchaToken }),
            });

            const data = await response.json();

            if (!response.ok) {
                grecaptcha.reset(); 
                throw new Error(data.detalhe || data.mensagem || 'Erro ao solicitar recuperação');
            }

            // Exibe mensagem de sucesso
            alert(data.mensagem);
            
            // Redireciona de volta para o login ou limpa o form
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 500);

        } catch (error) {
            console.error('Erro:', error);
            alert(error.message || 'Erro ao solicitar recuperação de senha');
        } finally {
            botaoLogin.disabled = false;
            botaoLogin.textContent = 'Enviar link de recuperação';
        }
    });
});