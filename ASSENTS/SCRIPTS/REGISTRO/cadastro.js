// ASSENTS/SCRIPTS/REGISTRO/cadastro.js
document.addEventListener('DOMContentLoaded', () => {
    const formCadastro = document.querySelector('.formulario-cadastro');
    
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('password').value;
        
        // Validações
        if (!nome || !email || !senha) {
            alert('Por favor, preencha todos os campos');
            return;
        }
        
        if (senha.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres');
            return;
        }
        
        const botaoCadastro = document.querySelector('.botao-cadastro');
        botaoCadastro.disabled = true;
        botaoCadastro.textContent = 'Registrando...';
        
        try {
            const resultado = await Auth.cadastrar(nome, email, senha);
            
            if (resultado.success) {
                alert('Cadastro realizado com sucesso! Faça login para continuar.');
                window.location.href = 'login.html';
            } else {
                alert(resultado.message || 'Erro no cadastro');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao conectar com o servidor');
        } finally {
            botaoCadastro.disabled = false;
            botaoCadastro.textContent = 'Registrar-se agora';
        }
    });
});