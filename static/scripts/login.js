// ASSENTS/SCRIPTS/REGISTRO/login.js
document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.querySelector('.formulario-login');
    
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value.trim();
        const senha = document.getElementById('login-password').value;
        const lembrar = document.querySelector('.checkbox-formulario input').checked;
        
        // Validação básica
        if (!email || !senha) {
            alert('Por favor, preencha todos os campos');
            return;
        }
        
        const botaoLogin = document.querySelector('.botao-login');
        botaoLogin.disabled = true;
        botaoLogin.textContent = 'Entrando...';
        
        try {
            const resultado = await Auth.login(email, senha);
            
            if (resultado.success) {
                if (lembrar) {
                    localStorage.setItem('lembrarUsuario', 'true');
                    localStorage.setItem('ultimoEmail', email);
                } else {
                    localStorage.removeItem('lembrarUsuario');
                    localStorage.removeItem('ultimoEmail');
                }
                
                // Redirecionar para área logada
                window.location.href = 'Ecomap.html';
            } else {
                alert(resultado.message || 'Erro no login');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao conectar com o servidor');
        } finally {
            botaoLogin.disabled = false;
            botaoLogin.textContent = 'Entrar na plataforma';
        }
    });
    
    // Preencher email se "Lembrar de mim" estava ativo
    if (localStorage.getItem('lembrarUsuario') === 'true') {
        const emailSalvo = localStorage.getItem('ultimoEmail');
        if (emailSalvo) {
            document.getElementById('login-email').value = emailSalvo;
            document.querySelector('.checkbox-formulario input').checked = true;
        }
    }
});