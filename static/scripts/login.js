document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.querySelector('.formulario-login');
    
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value.trim();
        const senha = document.getElementById('login-password').value;
        
        if (!email || !senha) {
            alert('Preencha todos os campos');
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
                body: JSON.stringify({ email, senha })
            });

            const data = await response.json();

            // Sua API Flask retorna um 401 em caso de falha. Verifique isso especificamente.
            if (!response.ok) {
                // A API retorna a chave 'mensagem' para sucesso e falha
                throw new Error(data.mensagem || 'Erro no login');
            }

            // SUCESSO! Armazene o token de forma segura.
            // Seu back-end deve retornar o token na chave 'access_token'
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
                
                // Você também pode armazenar dados do usuário se sua API os retornar
                // por exemplo, se a sua API também retornasse `username` ou `email`
                if (data.user) {
                    localStorage.setItem('userData', JSON.stringify(data.user));
                }

                alert(data.mensagem); // Mostra a mensagem de sucesso da API
                
                // Redireciona após um pequeno atraso
                setTimeout(() => {
                    window.location.href = 'Ecomap.html';
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

// ---
// ### Próximos Passos para a Sua Aplicação 🗺️

// Agora que seu script de login está salvando o **`access_token`** corretamente, veja como usá-lo para criar um ponto de coleta:

// **1. Crie o Script do Formulário de Ponto de Coleta:**
// Na sua página `Ecomap.html`, você terá um novo formulário para criar os pontos de coleta. O script para este formulário será parecido com o seu script de login, mas com uma diferença crucial: ele deve enviar o **`access_token`** no cabeçalho `Authorization`.

// **2. Modifique a Chamada `fetch` para Incluir o Token:**
// Antes de fazer a requisição `fetch`, recupere o token do `localStorage`.

// ```javascript
// // Obtém o token do localStorage
// const token = localStorage.getItem('access_token');

// // Verifique se o token existe antes de continuar
// if (!token) {
//     alert('Você precisa estar logado para criar um ponto de coleta.');
//     window.location.href = 'login.html'; // Redireciona para a página de login
//     return;
// }

// // Agora, faça a requisição para sua rota protegida
// fetch('[http://127.0.0.1:5000/pontos_de_coleta](http://127.0.0.1:5000/pontos_de_coleta)', { // Ou onde sua rota estiver
//     method: 'POST',
//     headers: {
//         'Content-Type': 'application/json',
//         // IMPORTANTE: Anexa o token ao cabeçalho Authorization
//         'Authorization': `Bearer ${token}` 
//     },
//     body: JSON.stringify({
//         // Os dados do seu formulário vêm aqui
//         nome: "Novo Ponto",
//         endereco: "Rua Exemplo, 123"
//     })
// })
// .then(response => {
//     if (response.status === 401) {
//         // Se o token for inválido ou expirado, lide com isso aqui
//         alert('Sua sessão expirou. Faça login novamente.');
//         localStorage.removeItem('access_token'); // Limpa o token antigo
//         window.location.href = 'login.html'; // Redireciona para o login
//         return;
//     }
//     return response.json();
// })
// .then(data => {
//     console.log('Ponto de coleta criado:', data);
//     alert('Ponto de coleta criado com sucesso!');
// })
// .catch(error => {
//     console.error('Erro ao criar ponto de coleta:', error);
//     alert('Ocorreu um erro ao criar o ponto de coleta.');
// });