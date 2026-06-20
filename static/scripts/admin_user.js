const API_BASE = 'https://ecomap-wshs.onrender.com'; // Define a base da API explicitamente
const API      = '/usuario';

let usuarios = [];
let modo     = 'add';
let editId   = null;

// ── Interceptador Centralizado (Substitui getAuthHeaders e renovarToken isolados) ──
async function apiFetch(endpoint, options = {}) {
    const accessToken = localStorage.getItem('access_token');
    
    // Injeta automaticamente os headers padrões e o token atual
    options.headers = {
        ...options.headers,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };

    // Transforma objetos puros no body em Strings JSON automaticamente
    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
    }

    // Faz a requisição montando a URL completa
    let response = await fetch(`${API_BASE}${endpoint}`, options);

    // Se der 401 (Não autorizado), o token provavelmente expirou
    if (response.status === 401) {
        console.warn("🔄 Access Token expirado. Tentando renovar com o Refresh Token...");
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
            redirecionarParaLogin();
            return;
        }

        try {
            // Tenta bater na rota de refresh
            const resRefresh = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${refreshToken}` }
            });

            if (resRefresh.ok) {
                const data = await resRefresh.json();
                localStorage.setItem('access_token', data.access_token);
                
                // Atualiza o cabeçalho com o NOVO token obtido
                options.headers['Authorization'] = `Bearer ${data.access_token}`;
                
                // Refaz e sobrescreve a requisição original que tinha falhado
                response = await fetch(`${API_BASE}${endpoint}`, options); 
            } else {
                console.error("Refresh token inválido ou expirado.");
                redirecionarParaLogin();
                return;
            }
        } catch (error) {
            console.error("Erro na comunicação de refresh:", error);
            redirecionarParaLogin();
            return;
        }
    }

    // Processa o JSON de forma segura e centralizada
    const dadosJson = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(dadosJson.mensagem || `Erro na requisição (Status ${response.status})`);
    }

    return dadosJson;
}

function redirecionarParaLogin() {
    if (!window.location.pathname.includes('login.html')) {
        localStorage.clear();
        alert("Sessão expirada. Por favor, faça login novamente.");
        window.location.href = 'login.html';
    }
}

// ── Render ──────────────────────────────────────────────────
function render(lista) {
    const tbody = document.getElementById('tabelaCorpo');
    tbody.innerHTML = '';

    if (!lista.length) {
        tbody.innerHTML = `
            <tr id="emptyRow">
                <td colspan="4" style="text-align: center;">
                    Nenhum usuário cadastrado ainda.
                </td>
            </tr>`;
        return;
    }

    lista.forEach(u => {
        const tr = document.createElement('tr');
        tr.dataset.id = u.id;
        tr.innerHTML = `
            <td><input type="checkbox" class="row-check"></td>
            <td>${u.nome}</td>
            <td>${u.email}</td>
            <td>
                <button class="btn-excluir-linha-admin"
                        data-id="${u.id}"
                        title="Excluir este usuário">🗑</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    atualizarBotoes();
}

// ── Busca local ──────────────────────────────────────────────
document.getElementById('campoBusca').addEventListener('input', function () {
    const q = this.value.toLowerCase();
    render(usuarios.filter(u =>
        u.nome.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    ));
});

// ── Seleção ──────────────────────────────────────────────────
document.getElementById('checkAll').addEventListener('change', function () {
    document.querySelectorAll('.row-check')
        .forEach(c => c.checked = this.checked);
    atualizarBotoes();
});

document.getElementById('tabelaCorpo').addEventListener('change', function (e) {
    if (e.target.classList.contains('row-check')) atualizarBotoes();
});

function getSelecionados() {
    return [...document.querySelectorAll('.row-check:checked')]
        .map(c => parseInt(c.closest('tr').dataset.id));
}

function atualizarBotoes() {
    const ids = getSelecionados();
    document.getElementById('btnEditarUsuario').disabled  = ids.length !== 1;
    document.getElementById('btnExcluirUsuario').disabled = ids.length === 0;
}

function resetarCheckboxes() {
    const checkAll = document.getElementById('checkAll');
    if (checkAll) checkAll.checked = false;
    document.querySelectorAll('.row-check').forEach(c => c.checked = false);
    atualizarBotoes();
}

// ── GET — carregar usuários (Refatorado) ─────────────────────
async function carregarUsuarios() {
    try {
        const data = await apiFetch(API, { method: 'GET' });
        usuarios   = data.usuarios || [];
        render(usuarios);
        resetarCheckboxes();
    } catch (err) {
        console.error('Erro ao carregar usuários:', err);
        alert(err.message || 'Não foi possível carregar os usuários.');
    }
}

// ── DELETE — botão da linha (Refatorado) ─────────────────────
document.getElementById('tabelaCorpo').addEventListener('click', async function (e) {
    const btn = e.target.closest('.btn-excluir-linha-admin');
    if (!btn) return;

    const id = parseInt(btn.dataset.id);
    if (!confirm('Excluir este usuário?')) return;

    try {
        await apiFetch(`${API}/${id}`, { method: 'DELETE' });
        await carregarUsuarios();
    } catch (err) {
        console.error('Erro ao excluir:', err);
        alert(err.message || 'Erro ao excluir usuário.');
    }
});

// ── DELETE — botão excluir selecionados (Refatorado) ──────────
document.getElementById('btnExcluirUsuario').addEventListener('click', async function () {
    const ids = getSelecionados();
    if (!ids.length) return;
    if (!confirm(`Excluir ${ids.length} usuário(s)?`)) return;

    try {
        const requisicoes = ids.map(id => apiFetch(`${API}/${id}`, { method: 'DELETE' }));
        await Promise.all(requisicoes);
        await carregarUsuarios();
    } catch (err) {
        console.error('Erro ao excluir em lote:', err);
        alert('Erro ao excluir um ou mais usuários selecionados.');
    }
});

// ── Modal — abrir ────────────────────────────────────────────
document.getElementById('btnAdicionarUsuario').addEventListener('click', function () {
    modo   = 'add';
    editId = null;

    document.getElementById('modalAdminTitulo').textContent = 'Novo Usuário';
    document.getElementById('usuarioId').value              = '';
    document.getElementById('inputNome').value              = '';
    document.getElementById('inputEmail').value             = '';
    document.getElementById('inputSenha').value              = '';
    document.getElementById('inputSenha').placeholder       = 'Senha';
    document.getElementById('btnSalvarAdmin').textContent   = 'Salvar';

    abrirModal();
});

document.getElementById('btnEditarUsuario').addEventListener('click', function () {
    const ids = getSelecionados();
    if (ids.length !== 1) return;

    modo   = 'edit';
    editId = ids[0];
    const u = usuarios.find(u => u.id === editId);

    document.getElementById('modalAdminTitulo').textContent = 'Editar Usuário';
    document.getElementById('usuarioId').value              = u.id;
    document.getElementById('inputNome').value              = u.nome;
    document.getElementById('inputEmail').value             = u.email;
    document.getElementById('inputSenha').value              = '';
    document.getElementById('inputSenha').placeholder       = 'Nova senha (deixe em branco para manter)';
    document.getElementById('btnSalvarAdmin').textContent   = 'Salvar';

    abrirModal();
});

// ── Modal — fechar ───────────────────────────────────────────
function abrirModal() {
    document.getElementById('modalOverlayAdmin').classList.add('aberto');
    document.getElementById('inputNome').focus();
}

function fecharModal() {
    document.getElementById('modalOverlayAdmin').classList.remove('aberto');
}

document.getElementById('modalAdminFechar').addEventListener('click', fecharModal);
document.getElementById('btnCancelarAdmin').addEventListener('click', fecharModal);

document.getElementById('modalOverlayAdmin').addEventListener('click', function (e) {
    if (e.target === this) fecharModal();
});

// ── POST / PUT — salvar (Refatorado) ─────────────────────────
document.getElementById('formUsuario').addEventListener('submit', async function (e) {
    e.preventDefault();

    const nome  = document.getElementById('inputNome').value.trim();
    const email = document.getElementById('inputEmail').value.trim();
    const senha = document.getElementById('inputSenha').value.trim();

    if (!nome || !email) { alert('Preencha nome e e-mail.'); return; }
    if (modo === 'add' && !senha) { alert('Preencha a senha.'); return; }

    try {
        if (modo === 'add') {
            await apiFetch(API, {
                method: 'POST',
                body: {
                    nome,
                    email,
                    senha,
                    termosAceitos: true,
                    'g-recaptcha-response': 'admin-bypass'
                }
            });
        } else {
            const body = { nome, email };
            if (senha) body.senha = senha;

            await apiFetch(`${API}/${editId}`, {
                method: 'PUT',
                body: body
            });
        }

        fecharModal();
        await carregarUsuarios();

    } catch (err) {
        console.error('Erro ao salvar:', err);
        alert(err.message || 'Erro de conexão com a API.');
    }
});

// ── Init ─────────────────────────────────────────────────────
carregarUsuarios();