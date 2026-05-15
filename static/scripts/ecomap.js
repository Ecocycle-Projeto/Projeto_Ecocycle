let listaMarcadores = [];

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
    if (nivel < 50) return 'green';
    if (nivel < 80) return 'orange';
    return 'red';
}

function criarIcone(nivel) {
    return L.divIcon({
        className: 'custom-pin',
        html: `<div style="background:${getCorNivel(nivel)}; width:20px; height:20px; border-radius:50% 50% 50% 0; transform:rotate(-45deg); border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 20],
        popupAnchor: [0, -22]
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
        L.circle([latitude, longitude], { radius: accuracy, color: '#068908', fillOpacity: 0.15 }).addTo(window.userLocationLayer);
        L.circleMarker([latitude, longitude], { radius: 8, color: 'white', fillColor: '#068908', fillOpacity: 1 }).addTo(window.userLocationLayer);
        map.setView([latitude, longitude], 16);
        btn.style.opacity = "1";
    }, () => {
        btn.style.opacity = "1";
        alert("Erro ao obter localização.");
    }, { enableHighAccuracy: true });
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
    // 1. Abre o modal
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

// 10. Carregamento dos Pontos Existentes
async function carregarPontos() {
    try {
        console.log("Iniciando carregamento de pontos...");
        const response = await apiFetch('http://127.0.0.1:5000/pontos_coleta');
        
        if (!response.ok) {
            console.error("Erro na resposta do servidor:", response.status);
            return;
        }

        const data = await response.json();
        const pontos = data.pontos || [];
        
        // Limpa marcadores antigos para não duplicar
        listaMarcadores.forEach(m => map.removeLayer(m.elemento));
        listaMarcadores = [];

        pontos.forEach(p => {
            const nivel = p.nivel_preenchimento || 0;
            const marker = L.marker([p.latitude, p.longitude], { icon: criarIcone(nivel) }).addTo(map);

            listaMarcadores.push({ elemento: marker, dados: p });

            // Lógica para mostrar botões apenas para o dono do ponto
            let botoesAcao = "";
            if (p.usuario_id == usuarioLogadoId) { 
                botoesAcao = `
                    <hr style="border: 0.5px solid #eee; margin: 10px 0;">
                    <div style="display: flex; gap: 8px;">
                        <button onclick='abrirEdicao(${JSON.stringify(p)})' 
                            style="flex:1; background: #f39c12; color: white; border: none; padding: 6px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                            ✏️ Editar
                        </button>
                        <button onclick="deletarPonto(${p.id})" 
                            style="flex:1; background: #e74c3c; color: white; border: none; padding: 6px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                            🗑️ Excluir
                        </button>
                    </div>
                `;
            }

            marker.bindPopup(`
                <div style="font-family: sans-serif; min-width: 180px;">
                    <b style="color: #2BA84A; font-size: 14px;">♻️ ${p.nome}</b><br>
                    <span style="font-size: 12px; color: #666;">📍 ${p.endereco}</span><br>
                    <div style="margin-top: 5px;">📊 Nível: <b style="color:${getCorNivel(nivel)}">${nivel}%</b></div>
                    ${botoesAcao}
                </div>
            `);
        });
        setTimeout(() => map.invalidateSize(), 200);
    } catch (err) {
        console.error('Erro crítico no carregarPontos:', err);
    }
}

carregarPontos();

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

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.clear(); 
    window.location.href = 'login.html'; 
});