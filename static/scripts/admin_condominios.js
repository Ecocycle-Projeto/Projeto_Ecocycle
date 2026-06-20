// static/scripts/admin_condominios.js

const API_BASE = 'https://ecomap-wshs.onrender.com';

// ── Interceptador de Requisições Inteligente ──────────────────
async function apiFetch(endpoint, options = {}) {
    let accessToken = localStorage.getItem('access_token');
    
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };

    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
    }

    let response = await fetch(`${API_BASE}${endpoint}`, options);

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
                options.headers['Authorization'] = `Bearer ${data.access_token}`;
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
const formCondominio   = document.getElementById('formCondominio');
const btnLocalizar     = document.getElementById('btnLocalizar');
const miniMapaContainer= document.getElementById('miniMapaContainer');
const displayLat       = document.getElementById('display-lat');
const displayLng       = document.getElementById('display-lng');

// ── Estado ───────────────────────────────────────────────────
let condominios = [];
let miniMapa    = null;
let marcador    = null;

// ── GET — Carregar condomínios ───────────────────────────────
async function carregarCondominios() {
    try {
        const data  = await apiFetch('/condominios', { method: 'GET' });
        condominios = data.condominios || [];
        renderizarTabela(condominios);
    } catch (err) {
        console.error('Erro ao carregar condomínios:', err);
    }
}

function renderizarTabela(lista) {
    tabelaCorpo.innerHTML = '';

    if (lista.length === 0) {
        tabelaCorpo.innerHTML = `
            <tr id="emptyRow">
                <td colspan="7" style="text-align:center;">Nenhum condomínio cadastrado ainda.</td>
            </tr>`;
        return;
    }

    lista.forEach(c => {
        const tr = document.createElement('tr');
        tr.dataset.id = c.id;
        tr.innerHTML = `
            <td><input type="checkbox" class="row-check"></td>
            <td>${c.nome}</td>
            <td>${c.cnpj || '—'}</td>
            <td>${c.responsavel}</td>
            <td>${c.telefone || '—'}</td>
            <td>${c.endereco || (c.ponto_coleta ? c.ponto_coleta.endereco : '—')}</td>
            <td>
                <button class="btn-excluir-linha" data-id="${c.id}" title="Excluir">🗑</button>
            </td>`;
        tabelaCorpo.appendChild(tr);
    });

    bindEventosLinhas();
}

// ── Busca ────────────────────────────────────────────────────
campoBusca.addEventListener('input', () => {
    const termo = campoBusca.value.toLowerCase().trim();
    const filtrados = condominios.filter(c =>
        c.nome.toLowerCase().includes(termo) ||
        c.responsavel.toLowerCase().includes(termo) ||
        (c.endereco && c.endereco.toLowerCase().includes(termo))
    );
    renderizarTabela(filtrados);
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
            excluirCondominios([btn.dataset.id]);
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
function abrirModal(modo, condominio = null) {
    formCondominio.reset();
    document.getElementById('condominioId').value = '';
    miniMapaContainer.style.display = 'none';
    displayLat.textContent = '-';
    displayLng.textContent = '-';

    if (modo === 'editar' && condominio) {
        modalTitulo.textContent = 'Editar Condomínio';
        document.getElementById('condominioId').value      = condominio.id;
        document.getElementById('inputNome').value         = condominio.nome;
        document.getElementById('inputCnpj').value         = condominio.cnpj || '';
        document.getElementById('inputResponsavel').value  = condominio.responsavel;
        document.getElementById('inputTelefone').value     = condominio.telefone || '';
        document.getElementById('inputHorario').value      = condominio.horario_funcionamento || '';
        document.getElementById('inputEndereco').value     = condominio.endereco || (condominio.ponto_coleta ? condominio.ponto_coleta.endereco : '');
        document.getElementById('inputDescricao').value    = condominio.descricao || '';

        const latitude = condominio.latitude || (condominio.ponto_coleta ? condominio.ponto_coleta.latitude : null);
        const longitude = condominio.longitude || (condominio.ponto_coleta ? condominio.ponto_coleta.longitude : null);

        if (latitude && longitude) {
            document.getElementById('inputLat').value = latitude;
            document.getElementById('inputLng').value = longitude;
            mostrarMiniMapa(parseFloat(latitude), parseFloat(longitude));
        }
    } else {
        modalTitulo.textContent = 'Novo Condomínio';
    }

    modalOverlay.style.display = 'flex';
}

function fecharModal() {
    modalOverlay.style.display = 'none';
    if (miniMapa) {
        miniMapa.remove();
        miniMapa = null;
        marcador = null;
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
    const condominio = condominios.find(c => c.id == ids[0]);
    abrirModal('editar', condominio);
});

// ── Mini mapa (Nominatim + Leaflet) ─────────────────────────
btnLocalizar.addEventListener('click', async () => {
    const endereco = document.getElementById('inputEndereco').value.trim();
    if (!endereco) return alert('Digite um endereço primeiro.');

    btnLocalizar.textContent = '⏳';
    btnLocalizar.disabled    = true;

    try {
        const urlBusca = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&countrycodes=br&limit=1`;
        const res = await fetch(urlBusca, { headers: { 'Accept-Language': 'pt-BR' } });
        const resultados = await res.json();
        
        if (resultados.length === 0) return alert('Endereço não encontrado.');
        const { lat, lon } = resultados[0];
        mostrarMiniMapa(parseFloat(lat), parseFloat(lon));
    } catch (err) {
        console.error('Erro ao buscar endereço:', err);
        alert('Erro ao buscar endereço.');
    } finally {
        btnLocalizar.textContent = '🔍 Localizar';
        btnLocalizar.disabled    = false;
    }
});

function mostrarMiniMapa(lat, lng) {
    // Garante que o container apareça antes para o Leaflet calcular as dimensões
    miniMapaContainer.style.display = 'block';

    if (miniMapa) {
        miniMapa.setView([lat, lng], 16);
        marcador.setLatLng([lat, lng]);
        atualizarCoordenadas(lat, lng);
        setTimeout(() => miniMapa.invalidateSize(), 50);
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

// CORRIGIDO DEFINITIVAMENTE: Sincronizado com 'z'
function atualizarCoordenadas(lat, lng) {
    const latF = parseFloat(lat).toFixed(6);
    const lngF = parseFloat(lng).toFixed(6);
    document.getElementById('inputLat').value = latF;
    document.getElementById('inputLng').value = lngF;
    displayLat.textContent = latF;
    displayLng.textContent = lngF;
}

// ── POST / PUT — Salvar ──────────────────────────────────────
formCondominio.addEventListener('submit', async e => {
    e.preventDefault();

    const id  = document.getElementById('condominioId').value;
    const lat = document.getElementById('inputLat').value;
    const lng = document.getElementById('inputLng').value;

    if (!lat || !lng) return alert('Localize o endereço no mapa antes de salvar.');

    const payload = {
        nome:                   document.getElementById('inputNome').value.trim(),
        cnpj:                   document.getElementById('inputCnpj').value.trim(),
        responsavel:            document.getElementById('inputResponsavel').value.trim(),
        telefone:               document.getElementById('inputTelefone').value.trim(),
        horario_funcionamento:  document.getElementById('inputHorario').value.trim(),
        descricao:              document.getElementById('inputDescricao').value.trim(),
        endereco:               document.getElementById('inputEndereco').value.trim(),
        latitude:               parseFloat(lat),
        longitude:              parseFloat(lng),
    };

    try {
        if (id) {
            await apiFetch(`/condominios/${id}`, { method: 'PUT', body: payload });
        } else {
            await apiFetch('/condominios', { method: 'POST', body: payload });
        }
        fecharModal();
        carregarCondominios();
    } catch (err) {
        alert(`Erro ao salvar: ${err.message}`);
    }
});

// ── DELETE — Excluir ─────────────────────────────────────────
async function excluirCondominios(ids) {
    if (!confirm(`Excluir ${ids.length} condomínio(s)? Esta ação não pode ser desfeita.`)) return;
    try {
        const requisicoes = ids.map(id => apiFetch(`/condominios/${id}`, { method: 'DELETE' }));
        await Promise.all(requisicoes);
        carregarCondominios();
    } catch (err) {
        alert(`Erro ao excluir: ${err.message}`);
    }
}

btnExcluir.addEventListener('click', () => {
    excluirCondominios(getSelecionados());
});

// ── Init ─────────────────────────────────────────────────────
carregarCondominios();