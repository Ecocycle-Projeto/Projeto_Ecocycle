// ── Elementos ──────────────────────────────────────────────
const chatbotBotao  = document.getElementById('chatbotBotaoAbrir');
const chatbotJanela = document.getElementById('chatbotJanela');
const chatbotCorpo  = document.getElementById('chatbotCorpo');
const chatbotInput  = document.getElementById('chatbotInput');
const chatbotForm   = document.getElementById('chatbotForm');


// ── Histórico da conversa (só em memória, some ao recarregar) ──
// Cada item: { role: "user" | "model", text: "..." }
let historicoConversa = [];

const LIMITE_HISTORICO = 10; // guarda só as últimas 10 trocas, evita gastar tokens à toa


// ── Abrir / fechar ─────────────────────────────────────────
chatbotBotao.addEventListener('click', function () {
    const aberto = chatbotJanela.classList.toggle('aberto');
    chatbotBotao.classList.toggle('aberto', aberto);

    if (aberto) chatbotInput.focus();
});


// ── Mensagem de boas-vindas ───────────────────────────────
adicionarMensagem(
    'bot',
    'Olá! 👋 Sou o assistente da EcoMap. Posso te ajudar com dúvidas sobre ' +
    'a plataforma (cadastro, pontos de coleta, favoritos...) e sobre como ' +
    'reciclar e descartar corretamente seus materiais. O que você quer saber?'
);
// não entra no histórico enviado à IA — é só uma mensagem de UI


// ── Envio de mensagem ──────────────────────────────────────
chatbotForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const texto = chatbotInput.value.trim();
    if (!texto) return;

    adicionarMensagem('usuario', texto);
    chatbotInput.value = '';
    chatbotInput.disabled = true;

    const loadingEl = adicionarMensagem('carregando', 'Digitando...');

    try {
        const res = await fetch('/chatbot', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mensagem: texto,
                historico: historicoConversa // manda o contexto junto
            })
        });

        const data = await res.json();

        loadingEl.remove();

        if (!res.ok) {
            adicionarMensagem('bot', data.mensagem || 'Erro ao consultar o assistente.');
        } else {
            adicionarMensagem('bot', data.resposta);

            // salva a troca no histórico local
            historicoConversa.push({ role: 'user',  text: texto });
            historicoConversa.push({ role: 'model', text: data.resposta });

            // mantém só as últimas N trocas pra não crescer infinito
            if (historicoConversa.length > LIMITE_HISTORICO * 2) {
                historicoConversa = historicoConversa.slice(-LIMITE_HISTORICO * 2);
            }
        }

    } catch (err) {
        loadingEl.remove();
        console.error('Erro no chatbot:', err);
        adicionarMensagem('bot', 'Não consegui me conectar ao assistente. Tente novamente.');
    } finally {
        chatbotInput.disabled = false;
        chatbotInput.focus();
    }
});


// ── Função auxiliar para adicionar mensagens ───────────────
function adicionarMensagem(tipo, texto) {
    const div = document.createElement('div');
    div.className = `chatbot-msg ${tipo}`;
    div.textContent = texto;

    chatbotCorpo.appendChild(div);
    chatbotCorpo.scrollTop = chatbotCorpo.scrollHeight;

    return div;
}