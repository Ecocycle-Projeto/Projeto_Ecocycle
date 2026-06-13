// ── Base URL da API ──────────────────────────────────────────
const API = '/usuario';


// ── Estado ──────────────────────────────────────────────────
let usuarios = [];
let modo     = 'add';
let editId   = null;


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


// ── GET — carregar usuários ──────────────────────────────────
async function carregarUsuarios() {
    try {
        const res  = await fetch(API);
        const data = await res.json();
        usuarios   = data.usuarios || [];
        render(usuarios);
    } catch (err) {
        console.error('Erro ao carregar usuários:', err);
        alert('Não foi possível carregar os usuários.');
    }
}


// ── DELETE — botão da linha ──────────────────────────────────
document.getElementById('tabelaCorpo').addEventListener('click', async function (e) {
    const btn = e.target.closest('.btn-excluir-linha-admin');
    if (!btn) return;

    const id = parseInt(btn.dataset.id);
    if (!confirm('Excluir este usuário?')) return;

    try {
        await fetch(`${API}/${id}`, { method: 'DELETE' });
        await carregarUsuarios();
    } catch (err) {
        console.error('Erro ao excluir:', err);
        alert('Erro ao excluir usuário.');
    }
});


// ── DELETE — botão excluir selecionados ─────────────────────
document.getElementById('btnExcluirUsuario').addEventListener('click', async function () {
    const ids = getSelecionados();
    if (!ids.length) return;
    if (!confirm(`Excluir ${ids.length} usuário(s)?`)) return;

    try {
        await Promise.all(ids.map(id =>
            fetch(`${API}/${id}`, { method: 'DELETE' })
        ));
        await carregarUsuarios();
    } catch (err) {
        console.error('Erro ao excluir:', err);
        alert('Erro ao excluir usuários.');
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
    document.getElementById('inputSenha').value             = '';
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
    document.getElementById('inputSenha').value             = '';
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


// ── POST / PUT — salvar ──────────────────────────────────────
document.getElementById('formUsuario').addEventListener('submit', async function (e) {
    e.preventDefault();

    const nome  = document.getElementById('inputNome').value.trim();
    const email = document.getElementById('inputEmail').value.trim();
    const senha = document.getElementById('inputSenha').value.trim();

    if (!nome || !email) { alert('Preencha nome e e-mail.'); return; }
    if (modo === 'add' && !senha) { alert('Preencha a senha.'); return; }

    try {
        if (modo === 'add') {
            const res = await fetch(API, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome,
                    email,
                    senha,
                    termosAceitos: true,
                    'g-recaptcha-response': 'admin-bypass'
                })
            });
            const data = await res.json();
            if (!res.ok) { alert(data.mensagem || 'Erro ao criar usuário.'); return; }

        } else {
            const body = { nome, email };
            if (senha) body.senha = senha;

            const res = await fetch(`${API}/${editId}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok) { alert(data.mensagem || 'Erro ao atualizar usuário.'); return; }
        }

        fecharModal();
        await carregarUsuarios();

    } catch (err) {
        console.error('Erro ao salvar:', err);
        alert('Erro de conexão com a API.');
    }
});


// ── Init ─────────────────────────────────────────────────────
carregarUsuarios();