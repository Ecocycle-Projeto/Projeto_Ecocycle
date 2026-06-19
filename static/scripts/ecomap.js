let listaMarcadores = [];
let posicaoUsuario = null;
let modoCadastroAtual = 'ponto'; // Pode ser 'ponto', 'empresa' ou 'condominio'

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
    
    let textoPopup = "";
    
    if (modoCadastroAtual === 'empresa') {
        textoPopup = `
            <div style="text-align: center;">
                <strong>Local da Empresa Selecionado!</strong><br>
                <button onclick="prepararFormularioEmpresa(${lat}, ${lng})" 
                    style="margin-top:10px; background:#2BA84A; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">
                    Preencher Dados da Empresa
                </button>
            </div>`;
    } else if (modoCadastroAtual === 'condominio') {
        textoPopup = `
            <div style="text-align: center;">
                <strong>Local do Condomínio Selecionado!</strong><br>
                <button onclick="prepararFormularioCondominio(${lat}, ${lng})" 
                    style="margin-top:10px; background:#2BA84A; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">
                    Preencher Dados do Condomínio
                </button>
            </div>`;
    } else {
        // Seu código atual de ponto de coleta...
        textoPopup = `
            <div style="text-align: center;">
                <strong>Novo Ponto Aqui?</strong><br>
                <button onclick="prepararFormulario(${lat}, ${lng})" 
                    style="margin-top:10px; background:#2BA84A; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">
                    Confirmar Local
                </button>
            </div>`;
    }

    marcadorTemporario.bindPopup(textoPopup).openPopup();
});

window.ativarModoCadastroEmpresa = function() {
    modoCadastroAtual = 'empresa';
    alert("🏭 Modo Empresa Ativado! Dê um clique no mapa onde sua empresa está localizada.");
};

window.ativarModoCadastroCondominio = function() {
    modoCadastroAtual = 'condominio';
    alert("🏢 Modo Condomínio Ativado! Dê um clique no mapa onde fica o condomínio.");
};

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

window.prepararFormularioEmpresa = function(lat, lng) {
    const modal = document.getElementById('modal-cadastro');
    const content = modal.querySelector('.modal-content');

    // Injeta dinamicamente os campos necessários para cadastrar a Empresa
    content.innerHTML = `
        <span class="close-modal" onclick="fecharModalEmpresa()">&times;</span>
        <h2 style="color:#2BA84A;">🏭 Cadastrar Minha Empresa</h2>
        <hr style="border:0.5px solid #333; margin-bottom:15px;">
        
        <div class="form-group" style="margin-bottom:12px;">
            <label style="display:block; margin-bottom:4px; font-weight:bold;">Nome da Empresa</label>
            <input type="text" id="emp-nome" placeholder="Ex: Recicladora EcoVida" style="width:100%; padding:8px; border-radius:4px; border:1px solid #333; background:#111; color:white;">
        </div>
        
        <div class="form-group" style="margin-bottom:12px;">
            <label style="display:block; margin-bottom:4px; font-weight:bold;">CNPJ</label>
            <input type="text" id="emp-cnpj" placeholder="Apenas números" style="width:100%; padding:8px; border-radius:4px; border:1px solid #333; background:#111; color:white;">
        </div>

        <div class="form-group" style="margin-bottom:12px;">
            <label style="display:block; margin-bottom:4px; font-weight:bold;">E-mail Corporativo</label>
            <input type="email" id="emp-email" placeholder="contato@empresa.com" style="width:100%; padding:8px; border-radius:4px; border:1px solid #333; background:#111; color:white;">
        </div>

        <div class="form-group" style="margin-bottom:12px;">
            <label style="display:block; margin-bottom:4px; font-weight:bold;">Telefone</label>
            <input type="text" id="emp-telefone" placeholder="(81) 99999-9999" style="width:100%; padding:8px; border-radius:4px; border:1px solid #333; background:#111; color:white;">
        </div>

        <div class="form-group" style="margin-bottom:15px;">
            <label style="display:block; margin-bottom:4px; font-weight:bold;">Descrição dos Serviços</label>
            <textarea id="emp-descricao" placeholder="O que sua empresa faz ou coleta?" maxlength="300" style="width:100%; padding:8px; border-radius:4px; border:1px solid #333; background:#111; color:white; height:70px; resize:none;"></textarea>
        </div>

        <button class="botao-salvar" onclick="salvarEmpresaNoServidor()" style="width:100%; background:#2BA84A; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; font-weight:bold;">
            Cadastrar Empresa
        </button>
    `;

    // Salva as coordenadas do clique nas variáveis globais da janela
    window.currentLat = lat;
    window.currentLng = lng;

    modal.style.display = 'block';
};

// Reseta o modo do cadastro e limpa o modal ao fechar
window.fecharModalEmpresa = function() {
    modoCadastroAtual = 'ponto'; // Reseta o modo para o padrão
    fecharModalServico(); // Chama a função que você já tem para resetar o HTML padrão do modal
};

window.prepararFormularioCondominio = function(lat, lng) {
    const modal = document.getElementById('modal-cadastro');
    const content = modal.querySelector('.modal-content');

    // 🌟 RECOUP: Removemos todo o filtro e o HTML do <select> de vínculo antigo!

    // Injeta o formulário do Condomínio de forma Autônoma no Modal
    content.innerHTML = `
    <span class="close-modal" onclick="fecharModalCondominio()">&times;</span>
    <h2 style="color:#2BA84A;">🏢 Cadastrar Meu Condomínio</h2>
    <hr style="border:0.5px solid #333; margin-bottom:15px;">
    
    <div class="form-group" style="margin-bottom:12px;">
        <label style="display:block; margin-bottom:4px; font-weight:bold;">Nome do Condomínio</label>
        <input type="text" id="cond-nome" placeholder="Ex: Residencial Green Park" style="width:100%; padding:8px; border-radius:4px; border:1px solid #333; background:#111; color:white;">
    </div>

    <div class="form-group" style="margin-bottom:12px;">
        <label style="display:block; margin-bottom:4px; font-weight:bold;">CNPJ do Condomínio</label>
        <input type="text" id="cond-cnpj" placeholder="Apenas números (Ex: 12345678000199)" style="width:100%; padding:8px; border-radius:4px; border:1px solid #333; background:#111; color:white;">
    </div>
    
    <div class="form-group" style="margin-bottom:12px;">
        <label style="display:block; margin-bottom:4px; font-weight:bold;">Endereço Completo</label>
        <input type="text" id="cond-endereco" placeholder="Rua, Número, Bairro" style="width:100%; padding:8px; border-radius:4px; border:1px solid #333; background:#111; color:white;">
    </div>

    <div class="form-group" style="margin-bottom:12px;">
        <label style="display:block; margin-bottom:4px; font-weight:bold;">Nome do Responsável / Síndico</label>
        <input type="text" id="cond-responsavel" placeholder="Quem gerencia o local?" style="width:100%; padding:8px; border-radius:4px; border:1px solid #333; background:#111; color:white;">
    </div>

    <div class="form-group" style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:4px; font-weight:bold;">Telefone de Contato</label>
        <input type="text" id="cond-telefone" placeholder="(81) 98888-8888" style="width:100%; padding:8px; border-radius:4px; border:1px solid #333; background:#111; color:white;">
    </div>

    <button class="botao-salvar" onclick="salvarCondominioNoServidor()" style="width:100%; background:#2BA84A; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; font-weight:bold;">
        Cadastrar Condomínio
    </button>
`;

    // Armazena as coordenadas temporariamente para o envio
    window.currentLat = lat;
    window.currentLng = lng;

    modal.style.display = 'block';
};

window.fecharModalCondominio = function() {
    modoCadastroAtual = 'ponto';
    fecharModalServico(); // Reseta o modal para o esqueleto padrão de pontos
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

window.salvarEmpresaNoServidor = async function() {
    const token = localStorage.getItem('access_token');
    
    const dados = {
        nome: document.getElementById('emp-nome').value.trim(),
        cnpj: document.getElementById('emp-cnpj').value.trim(),
        email: document.getElementById('emp-email').value.trim(),
        telefone: document.getElementById('emp-telefone').value.trim(),
        descricao: document.getElementById('emp-descricao').value.trim(),
        latitude: window.currentLat,
        longitude: window.currentLng
    };

    // Validações básicas no front-end
    if (!dados.nome || !dados.cnpj || !dados.email) {
        return alert("Nome, CNPJ e E-mail são obrigatórios!");
    }

    try {
        const response = await apiFetch('http://127.0.0.1:5000/empresas', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (response.ok) {
            alert("✅ Sua empresa foi cadastrada com sucesso e vinculada ao seu perfil!");
            window.fecharModalEmpresa();
            location.reload(); // Recarrega para ela brotar no mapa na mesma hora
        } else {
            alert("❌ Erro: " + (result.mensagem || result.erro || "Falha ao salvar empresa"));
        }
    } catch (error) {
        console.error("Erro no fetch de empresa:", error);
        alert("Erro ao conectar com o servidor.");
    }
};

window.salvarCondominioNoServidor = async function() {
    const token = localStorage.getItem('access_token');
    
    const dados = {
        nome: document.getElementById('cond-nome').value.trim(),
        cnpj: document.getElementById('cond-cnpj').value.trim(), // 🏦 CNPJ adicionado
        endereco: document.getElementById('cond-endereco').value.trim(),
        responsavel: document.getElementById('cond-responsavel').value.trim(),
        telefone: document.getElementById('cond-telefone').value.trim(),
        latitude: window.currentLat,
        longitude: window.currentLng
    };

    if (!dados.nome || !dados.cnpj || !dados.endereco || !dados.responsavel) {
        return alert("Por favor, preencha todos os campos obrigatórios (Nome, CNPJ, Endereço e Responsável)!");
    }

    try {
        const response = await apiFetch('http://127.0.0.1:5000/condominios', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (response.ok) {
            alert("✅ Condomínio cadastrado com sucesso como ponto de coleta autônomo!");
            window.fecharModalCondominio();
            location.reload();
        } else {
            alert("❌ Erro: " + (result.mensagem || result.erro || "Falha ao salvar condomínio"));
        }
    } catch (error) {
        console.error("Erro no fetch de condomínio:", error);
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

window.deletarEmpresa = async function(id) {
    if (!confirm("Deseja realmente excluir esta empresa?")) return;

    const token = localStorage.getItem('access_token');
    try {
        const response = await apiFetch(`http://127.0.0.1:5000/empresas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert("Empresa excluída com sucesso!");
            location.reload();
        } else {
            const data = await response.json();
            alert("Erro: " + (data.mensagem || "Não foi possível excluir."));
        }
    } catch (error) {
        console.error("Erro ao deletar empresa:", error);
    }
};

window.deletarCondominio = async function(id) {
    if (!confirm("Deseja realmente excluir este condomínio?")) return;

    const token = localStorage.getItem('access_token');
    try {
        const response = await apiFetch(`http://127.0.0.1:5000/condominios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert("Condomínio excluído com sucesso!");
            location.reload();
        } else {
            const data = await response.json();
            alert("Erro: " + (data.mensagem || "Não foi possível excluir."));
        }
    } catch (error) {
        console.error("Erro ao deletar condomínio:", error);
    }
};

const accessToken = localStorage.getItem('access_token');
const userData = JSON.parse(localStorage.getItem('userData'));
const usuarioLogadoId = userData ? userData.id : null;
const usuarioLogadoRole = userData ? userData.role : null;

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
            if (p.usuario_id == usuarioLogadoId || usuarioLogadoRole === 'admin') {
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

    let botoesCondominio = '';
    
    // 🎯 CORREÇÃO: Pega a chave exata do to_dict() e força ambos a virarem tipo Número
    const donoCondominioId = Number(c.id_usuario); 
    const logadoId = Number(usuarioLogadoId);

    if (donoCondominioId === logadoId || usuarioLogadoRole === 'admin') {
        botoesCondominio = `
            <hr style="border:0.5px solid #eee; margin:10px 0;">
            <div style="display:flex; gap:8px;">
                <button onclick="deletarCondominio(${c.id})"
                    style="flex:1; background:#e74c3c; color:white; border:none; padding:6px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold;">
                    🗑️ Excluir Condomínio
                </button>
            </div>`;
    }

    marker.bindPopup(`
        <div style="font-family:sans-serif; min-width:180px;">
            <b style="color:#2BA84A; font-size:14px;">🏢 ${c.nome}</b><br>
            <span style="font-size:12px; color:#666;">📍 ${c.endereco}</span><br>
            <span style="font-size:12px; color:#666;">👤 Responsável: ${c.responsavel}</span><br>
            ${c.telefone ? `<span style="font-size:12px; color:#666;">📞 ${c.telefone}</span>` : ''}
            ${botoesCondominio}
        </div>`);

    listaMarcadores.push({ elemento: marker, dados: c, tipo: 'condominio' });
});
        // ── Empresas ──
        (data.empresas || []).forEach(e => {
            const marker = L.marker([e.latitude, e.longitude], {
                icon: criarIcone(0, 'empresa')
            }).addTo(map);

            let botoesEmpresa = '';
            if (e.id_usuario == usuarioLogadoId || usuarioLogadoRole === 'admin') {
                botoesEmpresa = `
                    <hr style="border:0.5px solid #eee; margin:10px 0;">
                    <div style="display:flex; gap:8px;">
                        <button onclick="deletarEmpresa(${e.id})"
                            style="flex:1; background:#e74c3c; color:white; border:none; padding:6px; border-radius:4px; cursor:pointer; font-size:11px;">
                            🗑️ Excluir Empresa
                        </button>
                    </div>`;
            }

            marker.bindPopup(`
                <div style="font-family:sans-serif; min-width:180px;">
                    <b style="color:#2BA84A; font-size:14px;">🏭 ${e.nome}</b><br>
                    ${e.telefone  ? `<span style="font-size:12px; color:#666;">📞 ${e.telefone}</span><br>`  : ''}
                    ${e.descricao ? `<span style="font-size:12px; color:#aaa;">${e.descricao}</span>` : ''}
                    ${botoesEmpresa}
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
            apiFetch('http://127.0.0.1:5000/favoritos').catch(() => ({ ok: false }))
        ]);

        const dataServicos  = await resServicos.json();
        const dataFavoritos = resFavoritos.ok ? await resFavoritos.json() : { favoritos: [] };

        // Guarda ids dos favoritos para controle da estrela
        favoritosDoUsuario = new Set(
            (dataFavoritos.favoritos || []).map(f => f.id_servico)
        );

        const servicos = dataServicos.servicos || [];
        const idsFavoritados = [...favoritosDoUsuario];
        
        // 1. Filtra apenas os serviços favoritados
        const servicosFavoritos = servicos.filter(s => idsFavoritados.includes(s.id));
        
        // 2. Os destaques pegam os 3 primeiros serviços da lista geral
        const servicosDestaque = servicos;

        // Renderiza os cards nas respectivas seções
        renderizarCards('servico-em-destaque',  servicosDestaque);
        renderizarCards('servico-favoritados',  servicosFavoritos);

        // ── CONTROLE DE VISIBILIDADE DA SEÇÃO DE FAVORITOS ──
        const secaoFavoritados = document.querySelector('.servico-favoritados');
        if (secaoFavoritados) {
            if (servicosFavoritos.length === 0) {
                // Se não houver favoritos, esconde a seção inteira (Título + Cards)
                secaoFavoritados.style.display = 'none';
            } else {
                // ➔ CORRIGIDO: Removido o ".style" duplicado para evitar quebra de sintaxe
                secaoFavoritados.style.display = '';
            }
        }

    } catch (err) {
        console.error('Erro ao carregar serviços:', err);
    }
} 

function renderizarCards(secaoClasse, servicos) {
    const secao = document.querySelector(`.${secaoClasse}`);
    if (!secao) return;
    
    // ── 👁️ CONTROLE DE VISIBILIDADE DA SEÇÃO ──
    // Se o array de serviços vier vazio ([]), esconde a seção inteira e para a execução
    if (!servicos || servicos.length === 0) {
        secao.style.display = "none";
        return;
    } else {
        // Se houver serviços, garante que ela volte a aparecer
        secao.style.display = "block";
    }

    const caixa = secao.querySelector('.caixa-cards');
    if (!caixa) return;

    // Remove qualquer tag de estilo temporária que foi injetada anteriormente
    const estiloAntigo = document.getElementById('css-firefox-estrito');
    if (estiloAntigo) estiloAntigo.remove();
    
    // Reseta o estilo inline da caixa para o padrão do seu arquivo CSS externo
    caixa.style.cssText = "";

    // Pega o único card existente no HTML para servir como molde
    let cardsExistentes = caixa.querySelectorAll('.card');
    if (cardsExistentes.length === 0) return;
    const moldeCard = cardsExistentes[0].cloneNode(true);

    // Limpa a caixa para receber os dados reais do banco
    caixa.innerHTML = "";

    // ── 🎴 PREENCHIMENTO DOS CARDS DINÂMICOS ──
    servicos.forEach((s) => {
        const card = moldeCard.cloneNode(true);
        card.style.cssText = "";

        // Título e descrição
        card.querySelector('.titulo-servico').textContent    = s.nome;
        card.querySelector('.descricao-servico').textContent = s.descricao || 'Sem descrição.';

        // Imagens baseadas no tipo de material
        const nomeMinusculo = (s.nome || "").toLowerCase();
        let urlImagem = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80'; 

        if (nomeMinusculo.includes('óleo') || nomeMinusculo.includes('oleo') || nomeMinusculo.includes('cozinha')) {
            urlImagem = 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80';
        } else if (nomeMinusculo.includes('eletrônico') || nomeMinusculo.includes('eletronico') || nomeMinusculo.includes('pilha') || nomeMinusculo.includes('bateria') || nomeMinusculo.includes('computador')) {
            urlImagem = 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&w=400&q=80';
        } else if (nomeMinusculo.includes('plástico') || nomeMinusculo.includes('plastico') || nomeMinusculo.includes('garrafa') || nomeMinusculo.includes('pet')) {
            urlImagem = 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=400&q=80';
        } else if (nomeMinusculo.includes('papel') || nomeMinusculo.includes('papelão') || nomeMinusculo.includes('papelao') || nomeMinusculo.includes('caixa')) {
            urlImagem = 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=400&q=80';
        } else if (nomeMinusculo.includes('vidro') || nomeMinusculo.includes('garrafa de vidro')) {
            urlImagem = 'https://images.unsplash.com/photo-1613243555988-441166d4d6fd?auto=format&fit=crop&w=400&q=80';
        } else if (nomeMinusculo.includes('metal') || nomeMinusculo.includes('alumínio') || nomeMinusculo.includes('aluminio') || nomeMinusculo.includes('lata')) {
            urlImagem = 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?auto=format&fit=crop&w=400&q=80';
        }

        const imgEl = card.querySelector('.imagem-card');
        if (imgEl) imgEl.src = urlImagem;

        // Status
        const statusEl = card.querySelector('.status');
        if (statusEl) {
            statusEl.textContent = s.ativo ? '✅ Ativo' : '⛔ Indisponível';
            statusEl.style.color = s.ativo ? '#2BA84A' : '#e74c3c';
        }

        // Empresas e Impacto
        const impactoEl = card.querySelector('.impacto');
        if (impactoEl) {
            if (s.empresas && s.empresas.length > 0) {
                impactoEl.textContent = '🏭 ' + s.empresas.map(e => e.nome).join(', ');
                impactoEl.style.display = 'inline-block'; 
            } else {
                impactoEl.style.display = 'none'; 
            }
        }

        const distanciaEl = card.querySelector('.distancia');
        if (distanciaEl) {
            if (s.empresas && s.empresas.length > 1) {
                distanciaEl.textContent = `➔ Disponível em mais ${s.empresas.length - 1} locais`;
                distanciaEl.style.display = 'inline-block';
            } else {
                distanciaEl.style.display = 'none'; 
            }
        }

        // Evento dos Favoritos (Estrela)
        const estrelaDiv = card.querySelector('.estrela');
        if (estrelaDiv) {
            const estrelaImg = estrelaDiv.querySelector('img');
            const estaFavoritado = typeof favoritosDoUsuario !== 'undefined' ? favoritosDoUsuario.has(s.id) : false;
            if (estrelaImg) {
                estrelaImg.src = estaFavoritado ? '../static/imagens/estrela-cheia.png' : '../static/imagens/estrela-vazia.png';
            }
            estrelaDiv.onclick = null;
            estrelaDiv.onclick = (e) => {
                e.stopPropagation(); 
                toggleFavorito(s.id);
            };
        }

        // Evento de Localização no Mapa
        const mapaDiv = card.querySelector('.icone-mapa');
        if (mapaDiv) {
            const btnFantasma = mapaDiv.querySelector('button');
            if (btnFantasma) btnFantasma.style.display = 'none';
            mapaDiv.onclick = null;
            if (s.empresas && s.empresas.length > 0) {
                const empresa = s.empresas[0];
                if (empresa.latitude && empresa.longitude) {
                    mapaDiv.style.display = 'flex';
                    mapaDiv.onclick = () => centralizarEmpresaNoMapa(empresa.latitude, empresa.longitude, empresa.nome);
                } else {
                    mapaDiv.style.display = 'none';
                }
            } else {
                mapaDiv.style.display = 'none';
            }
        }

        // Botão Ver Detalhes
        const btn = card.querySelector('.botao-card');
        if (btn) {
            btn.textContent = 'Ver Detalhes';
            btn.onclick = null;
            btn.onclick = () => abrirModalServico(s);
        }

        caixa.appendChild(card);
    });
}

// ── FUNÇÃO PARA FAVORITAR / DESFAVORITAR SERVIÇO ────────────────
async function toggleFavorito(idServico) {
    try {
        const estaFavoritado = favoritosDoUsuario.has(idServico);
        const url = `http://127.0.0.1:5000/favoritos/${idServico}`;
        const metodo = estaFavoritado ? 'DELETE' : 'POST';

        const resposta = await apiFetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' }
        });

        if (resposta.ok) {
            if (estaFavoritado) {
                favoritosDoUsuario.delete(idServico);
            } else {
                favoritosDoUsuario.add(idServico);
            }

            // Recarrega de forma limpa re-renderizando as seções
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
    // 🕵️‍♂️ DEDO-DURO: Abre o F12 no navegador, clica no botão e veja o que aparece no Console!
    console.log("Dados do serviço clicado:", s);

    const modal   = document.getElementById('modal-cadastro');
    const content = modal.querySelector('.modal-content');

    // Correção de segurança: tenta pegar tanto 'empresas' quanto 'empresa' caso o backend varie
    const listaEmpresas = s.empresas || s.empresa || [];
    const temEmpresas = Array.isArray(listaEmpresas) ? listaEmpresas.length > 0 : !!listaEmpresas;

    // Se vier uma única empresa fora de uma lista, transforma em array para o .map não quebrar
    const empresasArray = Array.isArray(listaEmpresas) ? listaEmpresas : [listaEmpresas];

    content.innerHTML = `
        <span class="close-modal" onclick="fecharModalServico()">&times;</span>
        <h2 style="color:#2BA84A;">${s.nome}</h2>
        <hr style="border-color: #3B4444; margin: 10px 0;">
        <p style="color:#aaa; margin-bottom:12px;">${s.descricao || 'Sem descrição.'}</p>

        <p style="margin-bottom:8px;">
            <b>Status:</b>
            <span style="color:${s.ativo ? '#2BA84A' : '#e74c3c'}">
                ${s.ativo ? '✅ Ativo' : '⛔ Indisponível'}
            </span>
        </p>

        ${temEmpresas ? `
        <div style="margin-top:16px;">
            <b style="color:#fff;">Empresas que oferecem:</b>
            ${empresasArray.map(e => `
                <div style="
                    background:#1A2222;
                    border:1px solid #3B4444;
                    border-radius:8px;
                    padding:10px;
                    margin-top:8px;
                ">
                    <b style="color:#2BA84A;">🏭 ${e.nome || 'Empresa sem nome'}</b><br>
                    ${e.telefone ? `<span style="color:#aaa; font-size:13px;">📞 ${e.telefone}</span>` : ''}
                </div>
            `).join('')}
        </div>` : '<p style="color:#666; margin-top:16px;">Nenhuma empresa vinculada.</p>'}

        <button class="botao-salvar" style="margin-top:20px; width: 100%;" onclick="fecharModalServico()">
            Fechar
        </button>
    `;

    modal.style.display = 'block';
}

window.prepararFormularioServico = function() {
    const modal = document.getElementById('modal-cadastro');
    const content = modal.querySelector('.modal-content');

    // Injeta o formulário de Serviço no seu modal padrão
    content.innerHTML = `
        <span class="close-modal" onclick="fecharModalServico()">&times;</span>
        <h2 style="color:#2BA84A;">🛠️ Cadastrar Novo Serviço</h2>
        <hr style="border:0.5px solid #333; margin-bottom:15px;">
        
        <div class="form-group" style="margin-bottom:12px;">
            <label style="display:block; margin-bottom:4px; font-weight:bold;">Nome do Serviço</label>
            <input type="text" id="ser-nome" placeholder="Ex: Coleta de Óleo de Cozinha" style="width:100%; padding:8px; border-radius:4px; border:1px solid #333; background:#111; color:white;">
        </div>
        
        <div class="form-group" style="margin-bottom:15px;">
            <label style="display:block; margin-bottom:4px; font-weight:bold;">Descrição detalhada</label>
            <textarea id="ser-descricao" placeholder="Explique como funciona, horários ou volumes aceitos..." maxlength="300" style="width:100%; padding:8px; border-radius:4px; border:1px solid #333; background:#111; color:white; height:80px; resize:none;"></textarea>
        </div>

        <p style="font-size: 11px; color: #aaa; margin-bottom: 15px;">
            💡 Este serviço será automaticamente vinculado às empresas ativas sob a sua propriedade.
        </p>

        <button class="botao-salvar" onclick="salvarServicoNoServidor()" style="width:100%; background:#2BA84A; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; font-weight:bold;">
            Cadastrar Serviço
        </button>
    `;

    modal.style.display = 'block';
};

window.salvarServicoNoServidor = async function() {
    const token = localStorage.getItem('access_token');
    
    const dados = {
        nome: document.getElementById('ser-nome').value.trim(),
        descricao: document.getElementById('ser-descricao').value.trim(),
        ids_empresas: [] // O back-end que atualizamos hoje já busca e vincula as empresas do usuário logado se validarmos por lá, ou podemos deixar o Admin/Dono gerenciar
    };

    if (!dados.nome) {
        return alert("O nome do serviço é obrigatório!");
    }

    try {
        // Dispara para a rota que criamos no início
        const response = await apiFetch('http://127.0.0.1:5000/servicos', {
            method: 'POST',
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (response.ok) {
            alert("✅ Serviço cadastrado com sucesso no catálogo geral!");
            fecharModalServico();
            // Recarrega a vitrine de cards na hora para o serviço aparecer
            if (typeof carregarServicos === "function") carregarServicos(); 
        } else {
            alert("❌ Erro: " + (result.detalhe || result.erro || "Falha ao salvar serviço"));
        }
    } catch (error) {
        console.error("Erro no fetch de serviço:", error);
        alert("Erro ao conectar com o servidor.");
    }
};

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
