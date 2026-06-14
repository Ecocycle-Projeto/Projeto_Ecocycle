let listaMarcadores = [];
let posicaoUsuario = null;

// Verificação de Token
async function apiFetch(url, options = {}) {
    let accessToken = localStorage.getItem('access_token');
    
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };

    let response = await fetch(url, options);

    if (response.status === 401) {
        console.log("Access Token expirado, tentando refresh...");
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
            window.location.href = 'login.html';
            return;
        }

        const resRefresh = await fetch('http://127.0.0.1:5000/auth/refresh', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${refreshToken}` }
        });

        if (resRefresh.ok) {
            const data = await resRefresh.json();
            localStorage.setItem('access_token', data.access_token);
            options.headers['Authorization'] = `Bearer ${data.access_token}`;
            return await fetch(url, options); 
        } else {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    }
    return response;
}


if (!localStorage.getItem('access_token')) {
    alert("Sessão expirada. Por favor, faça login.");
    window.location.href = 'login.html';
}


// 1. Configuração Inicial
const map = L.map('map', { zoomControl: false }).setView([-8.2830, -35.9753], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// 2. Zoom e Controles
document.getElementById('btn-zoom-in').addEventListener('click', () => map.zoomIn());
document.getElementById('btn-zoom-out').addEventListener('click', () => map.zoomOut());

// 3. Funções de Estilo
function getCorNivel(nivel) {
    if (nivel < 50) return '#068908';  // Um verde-esmeralda/ciano moderno (Lixeira limpa)
    if (nivel < 80) return '#ff9f1c';  // Um laranja vivo e limpo (Alerta médio)
    return '#e71d36';                  // Um vermelho vibrante e imponente (Nível crítico/Buzzer ativo)
}

function criarIcone(nivel, tipo = 'ponto') {
    const cor = getCorNivel(nivel);

    const formatos = {
        ponto: {
            html: `<div style="
                background:${cor};
                width:20px; height:20px;
                border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);
                border:2px solid white;
            "></div>`,
            size: [20, 20],
            anchor: [10, 20]
        },

        condominio: {
            // Prédio geométrico: base retangular + telhado triangular
            html: `<div style="display:flex; flex-direction:column; align-items:center;">
                <div style="
                    width: 0; height: 0;
                    border-left: 12px solid transparent;
                    border-right: 12px solid transparent;
                    border-bottom: 10px solid ${cor};
                "></div>
                <div style="
                    background:${cor};
                    width: 20px; height: 16px;
                    border: 2px solid white;
                    border-top: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div style="
                        width: 5px; height: 7px;
                        background: white;
                        opacity: 0.8;
                    "></div>
                </div>
            </div>`,
            size: [24, 26],
            anchor: [12, 26]
        },

        empresa: {
            html: `<div style="
                background:${cor};
                width:24px; height:24px;
                border-radius:50%;
                border:2px solid white;
                display:flex; align-items:center; justify-content:center;
                font-size:13px; line-height:1;
            ">🏭</div>`,
            size: [24, 24],
            anchor: [12, 24]
        }
    };

    const f = formatos[tipo] || formatos.ponto;
    return L.divIcon({
        className: 'custom-pin',
        html: f.html,
        iconSize: f.size,
        iconAnchor: f.anchor,
        popupAnchor: [0, -26]
    });
}

// 4. Localização do Usuário
document.getElementById('localizacao').addEventListener('click', () => {
    if (!navigator.geolocation) return alert("Navegador sem suporte a GPS.");
    const btn = document.getElementById('localizacao');
    btn.style.opacity = "0.5";

    navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        if (window.userLocationLayer) map.removeLayer(window.userLocationLayer);
        window.userLocationLayer = L.layerGroup().addTo(map);

        // MODIFICAÇÃO AQUI: Limita o raio visual para no máximo 30 metros
        const raioControlado = Math.min(accuracy, 30);

        // Aplica o raio controlado no círculo azul/verde do usuário
        L.circle([latitude, longitude], { 
            radius: raioControlado, // Usa a variável limitada
            color: '#068908', 
            fillOpacity: 0.15 
        }).addTo(window.userLocationLayer);
        
        L.circleMarker([latitude, longitude], { 
            radius: 8, 
            color: 'white', 
            fillColor: '#068908', 
            fillOpacity: 1 
        }).addTo(window.userLocationLayer);
        
        map.setView([latitude, longitude], 16);
        btn.style.opacity = "1";
    }, () => {
        btn.style.opacity = "1";
        alert("Erro ao obter localização.");
    }, { 
        enableHighAccuracy: true,
        timeout: 10000 
    });
});

// 5. Lógica de Cadastro (CLIQUE NO MAPA)
let marcadorTemporario = null;

map.on('click', function(e) {
    const { lat, lng } = e.latlng;
    if (marcadorTemporario) map.removeLayer(marcadorTemporario);

    marcadorTemporario = L.marker([lat, lng], { draggable: true }).addTo(map);
    marcadorTemporario.bindPopup(`
        <div style="text-align: center;">
            <strong>Novo Ponto Aqui?</strong><br>
            <button onclick="prepararFormulario(${lat}, ${lng})" 
                style="margin-top: 10px; background: #2BA84A; color: white; border: none; padding: 8px; border-radius: 5px; cursor: pointer;">
                Confirmar Local
            </button>
        </div>
    `).openPopup();
});

// 6. Funções do Modal 
window.prepararFormulario = function(lat, lng) {
    document.getElementById('modal-cadastro').style.display = 'block';
    
    // Reset do título e botão
    document.querySelector('#modal-cadastro h2').innerText = "Novo Ponto de Coleta";
    const btnSalvar = document.querySelector('.botao-salvar');
    btnSalvar.innerText = "Cadastrar Ponto";
    btnSalvar.onclick = salvarPontoNoServidor;

    // Limpa os campos
    document.getElementById('cad-nome').value = "";
    document.getElementById('cad-endereco').value = "";
 

    window.currentLat = lat;
    window.currentLng = lng;
};

window.fecharModal = function() {
    document.getElementById('modal-cadastro').style.display = 'none';
    if (marcadorTemporario) map.removeLayer(marcadorTemporario);
};

// 7. Função chamada pelo botão "Editar" no Popup do mapa
window.abrirEdicao = function(p) {
  
    document.getElementById('modal-cadastro').style.display = 'block';
    
    // 2. Preenche os campos com os dados existentes
    document.getElementById('cad-nome').value = p.nome;
    document.getElementById('cad-endereco').value = p.endereco;
    document.getElementById('cad-horario').value = p.horario_funcionamento;
    document.getElementById('cad-descricao').value = p.descricao || '';
    
    // 3. Atualiza o título e o botão do modal
    document.querySelector('#modal-cadastro h2').innerText = "Editar Ponto de Coleta";
    const btnSalvar = document.querySelector('.botao-salvar');
    btnSalvar.innerText = "Salvar Alterações";
    
    // 4. Muda a função do clique para o modo Edição
    btnSalvar.onclick = () => salvarEdicaoNoServidor(p.id);
};

// 8. Função para enviar o PUT para o servidor
async function salvarEdicaoNoServidor(id) {
    const token = localStorage.getItem('access_token');
    const dados = {
        nome: document.getElementById('cad-nome').value,
        endereco: document.getElementById('cad-endereco').value,
        horario_funcionamento: document.getElementById('cad-horario').value,
        descricao: document.getElementById('cad-descricao').value
    };

    try {
       const response = await apiFetch(`http://127.0.0.1:5000/pontos_coleta/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            alert("Ponto atualizado com sucesso!");
            location.reload(); 
        } else {
            alert("Erro ao atualizar ponto.");
        }
    } catch (error) {
        console.error("Erro:", error);
    }
}

// 9. FUNÇÃO DE SALVAMENTO 
window.salvarPontoNoServidor = async function() {
    const token = localStorage.getItem('access_token');
    
    const dados = {
        nome: document.getElementById('cad-nome').value,
        endereco: document.getElementById('cad-endereco').value,
        horario_funcionamento: document.getElementById('cad-horario').value,
        descricao: document.getElementById('cad-descricao').value,
        latitude: window.currentLat,
        longitude: window.currentLng
    };

    if (!dados.nome || !dados.endereco) {
        return alert("Nome e Endereço são obrigatórios!");
    }

    try {
       const response = await apiFetch(`http://127.0.0.1:5000/pontos_coleta`,{
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (response.ok) {
            alert("✅ Ponto cadastrado com sucesso!");
            window.fecharModal();
            location.reload(); 
        } else {
            alert("❌ Erro: " + (result.erro || "Falha ao salvar"));
        }
    } catch (error) {
        console.error("Erro no fetch:", error);
        alert("Erro ao conectar com o servidor.");
    }
};

window.deletarPonto = async function(id) {
    if (!confirm("Deseja realmente excluir este ponto de coleta?")) return;

    const token = localStorage.getItem('access_token');
    try {
        const response = await apiFetch(`http://127.0.0.1:5000/pontos_coleta/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert("Ponto excluído com sucesso!");
            location.reload();
        } else {
            const data = await response.json();
            alert("Erro: " + (data.mensagem || "Não foi possível excluir."));
        }
    } catch (error) {
        console.error("Erro ao deletar:", error);
    }
};

const accessToken = localStorage.getItem('access_token');
const userData = JSON.parse(localStorage.getItem('userData'));
const usuarioLogadoId = userData ? userData.id : null;

function atualizarPainelProximos() {
    const lista = document.getElementById('lista-proximos');
    if (!lista) return; // se o painel não existir no HTML, ignora silenciosamente
}

// 10. Carregamento dos Pontos Existentes
async function carregarPontos() {
    try {
        const response = await apiFetch('http://127.0.0.1:5000/mapa');
        if (!response.ok) return;

        const data = await response.json();

        // Limpa só os marcadores antigos
        listaMarcadores.forEach(m => map.removeLayer(m.elemento));
        listaMarcadores = [];

        // ── Pontos de coleta ──
        (data.pontos || []).forEach(p => {
            const nivel  = p.percentual_atual || 0;
            const marker = L.marker([p.latitude, p.longitude], {
                icon: criarIcone(nivel, 'ponto')
            }).addTo(map);

            let botoesAcao = '';
            if (p.usuario_id == usuarioLogadoId) {
                botoesAcao = `
                    <hr style="border:0.5px solid #eee; margin:10px 0;">
                    <div style="display:flex; gap:8px;">
                        <button onclick='abrirEdicao(${JSON.stringify(p)})'
                            style="flex:1; background:#f39c12; color:white; border:none; padding:6px; border-radius:4px; cursor:pointer; font-size:11px;">
                            ✏️ Editar
                        </button>
                        <button onclick="deletarPonto(${p.id})"
                            style="flex:1; background:#e74c3c; color:white; border:none; padding:6px; border-radius:4px; cursor:pointer; font-size:11px;">
                            🗑️ Excluir
                        </button>
                    </div>`;
            }

            marker.bindPopup(`
                <div style="font-family:sans-serif; min-width:180px;">
                    <b style="color:#2BA84A; font-size:14px;">♻️ ${p.nome}</b><br>
                    <span style="font-size:12px; color:#666;">📍 ${p.endereco}</span><br>
                    <span style="font-size:12px; color:#666;">🕐 ${p.horario_funcionamento}</span><br>
                    <div style="margin-top:5px;">
                        📊 Capacidade: <b style="color:${getCorNivel(nivel)}">${nivel}%</b>
                        <div style="background:#333; border-radius:4px; height:6px; margin-top:4px;">
                            <div style="background:${getCorNivel(nivel)}; width:${nivel}%; height:6px; border-radius:4px;"></div>
                        </div>
                    </div>
                    ${botoesAcao}
                </div>`);

            listaMarcadores.push({ elemento: marker, dados: p, tipo: 'ponto' });
        });

        // ── Condomínios ──
        (data.condominios || []).forEach(c => {
            const marker = L.marker([c.latitude, c.longitude], {
                icon: criarIcone(0, 'condominio')
            }).addTo(map);

            marker.bindPopup(`
                <div style="font-family:sans-serif; min-width:180px;">
                    <b style="color:#2BA84A; font-size:14px;">🏢 ${c.nome}</b><br>
                    <span style="font-size:12px; color:#666;">📍 ${c.endereco}</span><br>
                    <span style="font-size:12px; color:#666;">👤 ${c.responsavel}</span><br>
                    ${c.telefone ? `<span style="font-size:12px; color:#666;">📞 ${c.telefone}</span>` : ''}
                </div>`);

            listaMarcadores.push({ elemento: marker, dados: c, tipo: 'condominio' });
        });

        // ── Empresas ──
        (data.empresas || []).forEach(e => {
            const marker = L.marker([e.latitude, e.longitude], {
                icon: criarIcone(0, 'empresa')
            }).addTo(map);

            marker.bindPopup(`
                <div style="font-family:sans-serif; min-width:180px;">
                    <b style="color:#2BA84A; font-size:14px;">🏭 ${e.nome}</b><br>
                    ${e.telefone  ? `<span style="font-size:12px; color:#666;">📞 ${e.telefone}</span><br>`  : ''}
                    ${e.descricao ? `<span style="font-size:12px; color:#aaa;">${e.descricao}</span>` : ''}
                </div>`);

            listaMarcadores.push({ elemento: marker, dados: e, tipo: 'empresa' });
        });

        atualizarPainelProximos();
        setTimeout(() => map.invalidateSize(), 200);

    } catch (err) {
        console.error('Erro ao carregar mapa:', err);
    }
}

carregarPontos();

setInterval(carregarPontos, 10000);


// --- LÓGICA DE BUSCA ---

// 1. Filtro em tempo real (Enquanto digita)
document.getElementById('pesquisa').addEventListener('input', function(e) {
    const termo = e.target.value.toLowerCase().trim();

    listaMarcadores.forEach(item => {
        const nome = item.dados.nome.toLowerCase();
        const desc = (item.dados.descricao || "").toLowerCase();
        const endereco = item.dados.endereco.toLowerCase();

        // Se o termo estiver vazio ou contido em algum campo, mostra. Senão, esconde.
        if (termo === "" || nome.includes(termo) || desc.includes(termo) || endereco.includes(termo)) {
            if (!map.hasLayer(item.elemento)) {
                item.elemento.addTo(map);
            }
        } else {
            map.removeLayer(item.elemento);
        }
    });
});

// 2. Ação ao apertar Enter
document.getElementById('pesquisa').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault(); 

        const termo = this.value.toLowerCase().trim();
        
        // Filtra os marcadores que estão visíveis no mapa agora
        const visiveis = listaMarcadores.filter(item => map.hasLayer(item.elemento));

        if (visiveis.length > 0) {
            // Pega o primeiro da lista, centraliza e abre o balãozinho
            const primeiro = visiveis[0].elemento;
            map.flyTo(primeiro.getLatLng(), 16);
            primeiro.openPopup();
        } else if (termo !== "") {
            alert("Nenhum ponto encontrado para: " + termo);
        }
    }
});

// ── VITRINE DE SERVIÇOS ─────────────────────────────────────

let favoritosDoUsuario = new Set(); // ids dos serviços já favoritados

async function carregarServicos() {
    try {
        const [resServicos, resFavoritos] = await Promise.all([
            apiFetch('http://127.0.0.1:5000/servicos'),
            apiFetch('http://127.0.0.1:5000/favoritos')
        ]);

        const dataServicos  = await resServicos.json();
        const dataFavoritos = resFavoritos.ok ? await resFavoritos.json() : { favoritos: [] };

        // Guarda ids dos favoritos para controle da estrela
        favoritosDoUsuario = new Set(
            dataFavoritos.favoritos.map(f => f.id_servico)
        );

        const servicos = dataServicos.servicos || [];
        const idsFavoritados = [...favoritosDoUsuario];
        
        // 1. Filtra apenas os serviços favoritados
        const servicosFavoritos = servicos.filter(s => idsFavoritados.includes(s.id));
        
        // 2. Os destaques pegam os 3 primeiros serviços da lista geral
        const servicosDestaque = servicos.slice(0, 3);

        // Renderiza os cards nas respectivas seções
        renderizarCards('servico-em-destaque',  servicosDestaque);
        renderizarCards('servico-favoritados',  servicosFavoritos.slice(0, 3));

        // ── CONTROLE DE VISIBILIDADE DA SEÇÃO DE FAVORITOS ──
        const secaoFavoritados = document.querySelector('.servico-favoritados');
        if (secaoFavoritados) {
            if (servicosFavoritos.length === 0) {
                // Se não houver favoritos, esconde a seção inteira (Título + Cards)
                secaoFavoritados.style.display = 'none';
            } else {
                // Se houver pelo menos um, exibe normalmente
                secaoFavoritados.style.style.display = '';
            }
        }

    } catch (err) {
        console.error('Erro ao carregar serviços:', err);
    }
} 

function renderizarCards(secaoClasse, servicos) {
    const secao = document.querySelector(`.${secaoClasse}`);
    const caixa = secao.querySelector('.caixa-cards');
    const cards = caixa.querySelectorAll('.card');

    cards.forEach((card, i) => {
        const s = servicos[i];

        if (!s) {
            card.style.display = 'none';
            return;
        }

        card.style.display = '';

        // ── Título e descrição ──
        card.querySelector('.titulo-servico').textContent    = s.nome;
        card.querySelector('.descricao-servico').textContent = s.descricao || 'Sem descrição.';

        // ── Status ──
        const statusEl       = card.querySelector('.status');
        statusEl.textContent = s.ativo ? '✅ Ativo' : '⛔ Indisponível';
        statusEl.style.color = s.ativo ? '#2BA84A' : '#e74c3c';

        // ── Empresas ──
        const impactoEl = card.querySelector('.impacto');
        impactoEl.textContent = s.empresas?.length
            ? '🏭 ' + s.empresas.map(e => e.nome).join(', ')
            : '';

        // ── Estrela (favoritar / desfavoritar) ──
        const estrelaDiv = card.querySelector('.estrela');
        const estrelaImg = estrelaDiv?.querySelector('img');
        if (estrelaDiv && estrelaImg) {
            const estaFavoritado = favoritosDoUsuario.has(s.id);
            
            // Alterna dinamicamente baseando-se nas imagens da sua pasta static
            estrelaImg.src = estaFavoritado    
                ? '../static/imagens/estrela-cheia.png'   
                : '../static/imagens/estrela-vazia.png';  
            
            estrelaDiv.title = estaFavoritado ? 'Remover dos favoritos' : 'Favoritar';
            estrelaDiv.style.cursor = 'pointer';
            estrelaDiv.onclick = () => toggleFavorito(s.id, estrelaDiv);
        }

        // ── Ícone do mapa ──
        const mapaDiv = card.querySelector('.icone-mapa');
        const mapaImg = mapaDiv?.querySelector('img');
        if (mapaDiv && mapaImg) {
            mapaDiv.style.display = ''; 
            mapaImg.src = '../static/imagens/lcone-localizar1.png';
            mapaDiv.title = 'Ver no mapa';
            mapaDiv.style.cursor = 'pointer';

            // Esconde o botão sobressalente do seu HTML template
            const btnFantasma = mapaDiv.querySelector('button');
            if (btnFantasma) btnFantasma.style.display = 'none';

            if (s.empresas && s.empresas.length > 0) {
                const empresa = s.empresas[0];
                if (empresa.latitude && empresa.longitude) {
                    mapaDiv.onclick = () => centralizarEmpresaNoMapa(
                        empresa.latitude,
                        empresa.longitude,
                        empresa.nome
                    );
                } else {
                    mapaDiv.style.display = 'none';
                }
            } else {
                mapaDiv.style.display = 'none';
            }
        }

        // ── Ícone agenda (visual apenas) ──
        const agendaDiv = card.querySelector('.icone-agenda');
        const agendaImg = agendaDiv?.querySelector('img');
        if (agendaDiv && agendaImg) {
            agendaImg.src = '../static/imagens/calendario.png';
            agendaDiv.style.cursor = 'pointer';
            agendaDiv.title = 'Agendar serviço';
        }

        // ── Botão Ver Detalhes ──
        const btn = card.querySelector('.botao-card');
        if (btn) {
            btn.textContent = 'Ver Detalhes';
            btn.onclick = () => abrirModalServico(s);
        }
    });
}

// ── FUNÇÃO PARA FAVORITAR / DESFAVORITAR SERVIÇO ────────────────
async function toggleFavorito(idServico, elementoEstrela) {
    try {
        const estaFavoritado = favoritosDoUsuario.has(idServico);
        const url = `http://127.0.0.1:5000/favoritos/${idServico}`;
        const metodo = estaFavoritado ? 'DELETE' : 'POST';

        const resposta = await apiFetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' }
        });

        if (resposta.ok) {
            // 1. Atualiza o Set de favoritos local na memória
            if (estaFavoritado) {
                favoritosDoUsuario.delete(idServico);
            } else {
                favoritosDoUsuario.add(idServico);
            }

            // 2. CHAMADA CRUCIAL: Recarrega e redistribui as listas.
            // Isso vai fazer a seção de favoritos aparecer/sumir e alinhar tudo.
            await carregarServicos();

        } else {
            const erroDados = await resposta.json();
            console.error('Erro retornado pelo servidor:', erroDados.mensagem || erroDados.erro);
        }
    } catch (err) {
        console.error('Erro ao processar favorito:', err);
    }
}
// ── CENTRALIZAR NO MAPA ─────────────────────────────────────

function centralizarEmpresaNoMapa(lat, lng, nome) {
    // Rola a página até o mapa
    document.querySelector('.mapa').scrollIntoView({ behavior: 'smooth' });

    setTimeout(() => {
        map.flyTo([lat, lng], 16);

        // Abre o popup da empresa se existir no mapa
        listaMarcadores.forEach(m => {
            if (m.tipo === 'empresa' && m.dados.nome === nome) {
                setTimeout(() => m.elemento.openPopup(), 800);
            }
        });
    }, 500);
}

// ── MODAL DE DETALHES DO SERVIÇO ────────────────────────────

function abrirModalServico(s) {
    const modal   = document.getElementById('modal-cadastro');
    const content = modal.querySelector('.modal-content');

    content.innerHTML = `
        <span class="close-modal" onclick="fecharModalServico()">&times;</span>
        <h2 style="color:#2BA84A;">${s.nome}</h2>
        <hr>
        <p style="color:#aaa; margin-bottom:12px;">${s.descricao || 'Sem descrição.'}</p>

        <p style="margin-bottom:8px;">
            <b>Status:</b>
            <span style="color:${s.ativo ? '#2BA84A' : '#e74c3c'}">
                ${s.ativo ? '✅ Ativo' : '⛔ Indisponível'}
            </span>
        </p>

        ${s.empresas?.length ? `
        <div style="margin-top:16px;">
            <b>Empresas que oferecem:</b>
            ${s.empresas.map(e => `
                <div style="
                    background:#1A2222;
                    border:1px solid #3B4444;
                    border-radius:8px;
                    padding:10px;
                    margin-top:8px;
                ">
                    <b style="color:#2BA84A;">🏭 ${e.nome}</b><br>
                    ${e.telefone ? `<span style="color:#aaa; font-size:13px;">📞 ${e.telefone}</span>` : ''}
                </div>
            `).join('')}
        </div>` : '<p style="color:#666;">Nenhuma empresa vinculada.</p>'}

        <button class="botao-salvar" style="margin-top:20px;" onclick="fecharModalServico()">
            Fechar
        </button>
    `;

    modal.style.display = 'block';
}

window.fecharModalServico = function() {
    const modal   = document.getElementById('modal-cadastro');
    const content = modal.querySelector('.modal-content');
    modal.style.display = 'none';

    content.innerHTML = `
        <span class="close-modal" onclick="fecharModal()">&times;</span>
        <h2>Novo Ponto de Coleta</h2>
        <hr>
        <div class="form-group">
            <label>Nome do Local</label>
            <input type="text" id="cad-nome" placeholder="Ex: Ecoponto Central">
        </div>
        <div class="form-group">
            <label>Endereço</label>
            <input type="text" id="cad-endereco" placeholder="Rua, número, bairro...">
        </div>
        <div class="form-group">
            <label>Horário de Funcionamento</label>
            <input type="text" id="cad-horario" placeholder="Seg a Sex: 08h - 18h">
        </div>
        <div class="form-group">
            <label>Descrição / Materiais</label>
            <textarea id="cad-descricao" maxlength="300" placeholder="O que pode ser descartado aqui?"></textarea>
        </div>
        <div class="coordenadas-display">
            <span>Lat: <b id="display-lat"></b></span>
            <span>Lng: <b id="display-lng"></b></span>
        </div>
        <button class="botao-salvar" onclick="salvarPontoNoServidor()">Cadastrar Ponto</button>
    `;
}

carregarServicos();

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.clear(); 
    window.location.href = 'login.html'; 
});
