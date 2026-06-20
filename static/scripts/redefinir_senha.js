document.addEventListener('DOMContentLoaded', () => {
    const formRedefinir = document.getElementById('form-redefinir');
    
    formRedefinir.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const novaSenha = document.getElementById('new-password').value;
        const confirmarSenha = document.getElementById('confirm-password').value;
        
        if (!novaSenha || !confirmarSenha) {
            alert('Preencha todos os campos.');
            return;
        }

        if (novaSenha !== confirmarSenha) {
            alert('As senhas não coincidem. Verifique os campos.');
            return;
        }

        // Pega o token da URL (ex: redefinir_senha.html?token=12345)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            alert('Token de recuperação ausente ou inválido. Solicite um novo link.');
            return;
        }

        const botaoLogin = document.querySelector('.botao-login');
        botaoLogin.disabled = true;
        botaoLogin.textContent = 'Salvando...';

        try {
            const response = await fetch('/auth/redefinir_senha', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: token, nova_senha: novaSenha }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.mensagem || 'Erro ao redefinir a senha');
            }

            alert(data.mensagem);
            
            // Redireciona para o login após o sucesso
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 500);

        } catch (error) {
            console.error('Erro:', error);
            alert(error.message || 'Erro ao redefinir senha');
        } finally {
            botaoLogin.disabled = false;
            botaoLogin.textContent = 'Salvar nova senha';
        }
    });
});