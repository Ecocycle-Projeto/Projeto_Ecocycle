// static/scripts/admin_empresas.js

const API_BASE = 'https://ecomap-wshs.onrender.com';

// ── Interceptador de Requisições Inteligente ──────────────────
async function apiFetch(endpoint, options = {}) {
    let accessToken = localStorage.getItem('access_token');
    
    // Configura headers padrões automaticamente
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };

    // Facilidade: Se passarmos o body como objeto, transforma em string JSON automaticamente
    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
    }

    let response = await fetch(`${API_BASE}${endpoint}`, options);

    // Se o Access Token estiver expirado (401), tenta o refresh automaticamente
    if (response.status === 401) {
        console.warn("🔄 Access Token expirado, tentando refresh...");
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
            redirecionarParaLogin();
            return;
        }

        try {
            const resRefresh = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${refreshToken}` }
            });

            if (resRefresh.ok) {
                const data = await resRefresh.json();
                localStorage.setItem('access_token', data.access_token);
                
                // Recarrega o cabeçalho com o NOVO token obtido
                options.headers['Authorization'] = `Bearer ${data.access_token}`;
                
                // Refaz e substitui a requisição original que falhou
                response = await fetch(`${API_BASE}${endpoint}`, options); 
            } else {
                redirecionarParaLogin();
                return;
            }
        } catch (error) {
            console.error("Erro na comunicação de refresh:", error);
            redirecionarParaLogin();
            return;
        }
    }

    // Processa o JSON centralizadamente e lança exceção se o servidor retornar erro
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

// ── Verificação de Inicialização Segura ───────────────────────
if (!window.location.pathname.includes('login.html')) {
    if (!localStorage.getItem('access_token') && !localStorage.getItem('refresh_token')) {
        window.location.href = 'login.html';
    }
}

// ── Referências DOM ──────────────────────────────────────────
const tabelaCorpo      = document.getElementById('tabelaCorpo');
const campoBusca       = document.getElementById('campoBusca');
const btnAdicionar     = document.getElementById('btnAdicionar');
const btnEditar        = document.getElementById('btnEditar');
const btnExcluir       = document.getElementById('btnExcluir');
const checkAll         = document.getElementById('checkAll');
const modalOverlay     = document.getElementById('modalOverlay');
const modalTitulo      = document.getElementById('modalTitulo');
const modalFechar      = document.getElementById('modalFechar');
const btnCancelarModal = document.getElementById('btnCancelarModal');
const formEmpresa      = document.getElementById('formEmpresa');
const btnLocalizar     = document.getElementById('btnLocalizar');
const miniMapaContainer= document.getElementById('miniMapaContainer');
const displayLat       = document.getElementById('display-lat');
const displayLng       = document.getElementById('display-lng');

// ── Estado ───────────────────────────────────────────────────
let empresas   = [];
let miniMapa   = null;
let marcador   = null;

// ── GET — Carregar empresas (Atualizado para apiFetch) ────────
async function carregarEmpresas() {
    try {
        const data = await apiFetch('/empresas', { method: 'GET' });
        empresas   = data.empresas || [];
        renderizarTabela(empresas);
    } catch (err) {
        console.error('Erro ao carregar empresas:', err);
    }
}

function renderizarTabela(lista) {
    tabelaCorpo.innerHTML = '';

    if (lista.length === 0) {
        tabelaCorpo.innerHTML = `
            <tr id="emptyRow">
                <td colspan="7" style="text-align:center;">Nenhuma empresa cadastrada ainda.</td>
            </tr>`;
        return;
    }

    lista.forEach(e => {
        const tr = document.createElement('tr');
        tr.dataset.id = e.id;
        tr.innerHTML = `
            <td><input type="checkbox" class="row-check"></td>
            <td>${e.nome}</td>
            <td>${e.cnpj}</td>
            <td>${e.email}</td>
            <td>${e.telefone || '—'}</td>
            <td>${e.ativa ? '✅ Ativa' : '⛔ Inativa'}</td>
            <td>
                <button class="btn-excluir-linha" data-id="${e.id}" title="Excluir">🗑</button>
            </td>`;
        tabelaCorpo.appendChild(tr);
    });

    bindEventosLinhas();
}

// ── Busca ────────────────────────────────────────────────────
campoBusca.addEventListener('input', () => {
    const termo = campoBusca.value.toLowerCase().trim();
    const filtradas = empresas.filter(e =>
        e.nome.toLowerCase().includes(termo) ||
        e.cnpj.toLowerCase().includes(termo) ||
        e.email.toLowerCase().includes(termo)
    );
    renderizarTabela(filtradas);
});

// ── Seleção ──────────────────────────────────────────────────
function bindEventosLinhas() {
    document.querySelectorAll('.row-check').forEach(cb => {
        cb.addEventListener('change', atualizarBotoes);
    });

    document.querySelectorAll('#tabelaCorpo tr').forEach(tr => {
        tr.addEventListener('click', e => {
            if (e.target.closest('button') || e.target.tagName === 'INPUT') return;
            const cb = tr.querySelector('.row-check');
            if (!cb) return;
            cb.checked = !cb.checked;
            atualizarBotoes();
        });
    });

    document.querySelectorAll('.btn-excluir-linha').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            excluirEmpresas([btn.dataset.id]);
        });
    });
}

checkAll.addEventListener('change', () => {
    document.querySelectorAll('.row-check').forEach(cb => {
        cb.checked = checkAll.checked;
    });
    atualizarBotoes();
});

function getSelecionados() {
    return Array.from(document.querySelectorAll('.row-check:checked'))
        .map(cb => cb.closest('tr').dataset.id);
}

function atualizarBotoes() {
    const selecionados  = getSelecionados();
    btnEditar.disabled  = selecionados.length !== 1;
    btnExcluir.disabled = selecionados.length === 0;
}

// ── Modal ────────────────────────────────────────────────────
function abrirModal(modo, empresa = null) {
    formEmpresa.reset();
    document.getElementById('empresaId').value = '';
    miniMapaContainer.style.display = 'none';
    displayLat.textContent = '-';
    displayLng.textContent = '-';

    if (modo === 'editar' && empresa) {
        modalTitulo.textContent = 'Editar Empresa';
        document.getElementById('empresaId').value    = empresa.id;
        document.getElementById('inputNome').value    = empresa.nome;
        document.getElementById('inputCnpj').value    = empresa.cnpj;
        document.getElementById('inputEmail').value   = empresa.email;
        document.getElementById('inputTelefone').value= empresa.telefone || '';
        document.getElementById('inputDescricao').value= empresa.descricao || '';
        document.getElementById('inputEndereco').value = empresa.endereco || '';
        document.getElementById('inputAtiva').value   = empresa.ativa ? 'true' : 'false';

        if (empresa.latitude && empresa.longitude) {
            document.getElementById('inputLat').value = empresa.latitude;
            document.getElementById('inputLng').value = empresa.longitude;
            mostrarMiniMapa(empresa.latitude, empresa.longitude);
        }
    } else {
        modalTitulo.textContent = 'Nova Empresa';
    }

    modalOverlay.style.display = 'flex';
}

function fecharModal() {
    modalOverlay.style.display = 'none';
    if (miniMapa) {
        miniMapa.remove(); // Evita vazamento de memória e bugs de renderização
        miniMapa  = null;
        marcador  = null;
    }
}

btnAdicionar.addEventListener('click', () => abrirModal('adicionar'));
modalFechar.addEventListener('click', fecharModal);
btnCancelarModal.addEventListener('click', fecharModal);
modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) fecharModal();
});

btnEditar.addEventListener('click', () => {
    const ids = getSelecionados();
    if (ids.length !== 1) return;
    const empresa = empresas.find(e => e.id == ids[0]);
    abrirModal('editar', empresa);
});

// ── Mini mapa (Nominatim + Leaflet) ─────────────────────────
btnLocalizar.addEventListener('click', async () => {
    const endereco = document.getElementById('inputEndereco').value.trim();
    if (!endereco) return alert('Digite um endereço primeiro.');

    btnLocalizar.textContent = '⏳';
    btnLocalizar.disabled    = true;

    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=1`,
            { headers: { 'Accept-Language': 'pt-BR' } }
        );
        const resultados = await res.json();
        if (resultados.length === 0) return alert('Endereço não encontrado.');
        const { lat, lon } = resultados[0];
        mostrarMiniMapa(parseFloat(lat), parseFloat(lon));
    } catch {
        alert('Erro ao buscar endereço.');
    } finally {
        btnLocalizar.textContent = '🔍 Localizar';
        btnLocalizar.disabled    = false;
    }
});

function mostrarMiniMapa(lat, lng) {
    miniMapaContainer.style.display = 'block';

    if (miniMapa) {
        miniMapa.setView([lat, lng], 16);
        marcador.setLatLng([lat, lng]);
        atualizarCoordenadas(lat, lng);
        return;
    }

    miniMapa = L.map('miniMapa').setView([lat, lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(miniMapa);

    marcador = L.marker([lat, lng], { draggable: true }).addTo(miniMapa);
    marcador.on('dragend', () => {
        const pos = marcador.getLatLng();
        atualizarCoordenadas(pos.lat, pos.lng);
    });

    atualizarCoordenadas(lat, lng);
    setTimeout(() => miniMapa.invalidateSize(), 100);
}

function atualizarCoordenadas(lat, lng) {
    const latF = parseFloat(lat).toFixed(6);
    const lngF = parseFloat(lng).toFixed(6);
    document.getElementById('inputLat').value = latF;
    document.getElementById('inputLng').value = lngF;
    displayLat.textContent = latF;
    displayLng.textContent = lngF;
}

// ── POST / PUT — Salvar Empresa (CORRIGIDO) ───
formEmpresa.addEventListener('submit', async e => {
    e.preventDefault();

    const id  = document.getElementById('empresaId').value;
    const lat = document.getElementById('inputLat').value;
    const lng = document.getElementById('inputLng').value;

    if (!lat || !lng) return alert('Localize o endereço no mapa antes de salvar.');

    // Captura os dados montando o payload correto para a API
    const payload = {
        nome:      document.getElementById('inputNome').value.trim(),
        cnpj:      document.getElementById('inputCnpj').value.trim(),
        email:     document.getElementById('inputEmail').value.trim(),
        telefone:  document.getElementById('inputTelefone').value.trim(),
        descricao: document.getElementById('inputDescricao').value.trim(),
        endereco:  document.getElementById('inputEndereco').value.trim(), 
        ativa:     document.getElementById('inputAtiva').value === 'true',
        latitude:  parseFloat(lat),
        longitude: parseFloat(lng),
    };

    try {
        if (id) {
            await apiFetch(`/empresas/${id}`, { method: 'PUT', body: payload });
        } else {
            await apiFetch('/empresas', { method: 'POST', body: payload });
        }
        fecharModal();
        carregarEmpresas();
    } catch (err) {
        // Exibe o erro real retornado pelo seu backend Flask para ajudar no diagnóstico
        alert(`Erro ao salvar: ${err.message}`);
    }
});
// ── DELETE — Excluir empresas (Atualizado para apiFetch) ──────
async function excluirEmpresas(ids) {
    if (!confirm(`Excluir ${ids.length} empresa(s)? Esta ação não pode ser desfeita.`)) return;
    try {
        const requisicoes = ids.map(id => apiFetch(`/empresas/${id}`, { method: 'DELETE' }));
        await Promise.all(requisicoes);
        carregarEmpresas();
    } catch (err) {
        alert(`Erro ao excluir: ${err.message}`);
    }
}

btnExcluir.addEventListener('click', () => {
    excluirEmpresas(getSelecionados());
});

// ── Init ─────────────────────────────────────────────────────
carregarEmpresas();