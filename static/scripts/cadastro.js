document.addEventListener('DOMContentLoaded', () => {
    // === LÓGICA DO MODAL ===
    const modal = document.getElementById("modalTermos");
    const btnAbrir = document.getElementById("abrirModal");
    const btnFechar = document.querySelector(".fechar");

    // Abrir o modal
    btnAbrir.onclick = () => {
        modal.style.display = "block";
    };

    // Fechar no X
    btnFechar.onclick = () => {
        modal.style.display = "none";
    };

    // Fechar ao clicar fora da caixa branca
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

    // === LÓGICA DE CADASTRO ===
    const formCadastro = document.querySelector('.formulario-cadastro');
    
    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const senha = document.getElementById('password').value;
        const termosAceitos = document.getElementById('termos').checked;
        const recaptchaToken = grecaptcha.getResponse();
        

        // Validações de Frontend
        if (!nome || !email || !senha) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        if (!termosAceitos){
            alert("Por favor, você precisa ler e aceitar os termos de uso")
            return;
        }
        
        if (!recaptchaToken) {
            alert('Por favor, valide o reCAPTCHA.');
            return;
        }

        const botaoCadastro = document.querySelector('.botao-cadastro');
        botaoCadastro.disabled = true;
        botaoCadastro.textContent = 'Registrando...';
        
        try {
            const response = await fetch('http://127.0.0.1:5000/usuario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome,
                    email,
                    senha,
                    termosAceitos,
                    'g-recaptcha-response': recaptchaToken
                })
            });

            const resultado = await response.json();

            if (!response.ok) {
                grecaptcha.reset(); 
                throw new Error(resultado.mensagem || 'Erro no cadastro');
            }

            alert('Cadastro realizado com sucesso!');
            window.location.href = 'login.html';

        } catch (error) {
            console.error('Erro:', error);
            alert(error.message || 'Erro ao conectar com o servidor');
        } finally {
            botaoCadastro.disabled = false;
            botaoCadastro.textContent = 'Registrar-se agora';
        }
    });
});