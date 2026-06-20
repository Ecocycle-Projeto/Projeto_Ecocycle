document.addEventListener('DOMContentLoaded', () => {
    // --- VARIÁVEIS DO LEAFLET ---
    let mapa = null;
    let marcador = null;
    const padraoLat = -23.550520;
    const padraoLng = -46.633308;

    // --- ELEMENTOS DO DOM ---
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitulo = document.getElementById('modalTitulo');
    const formPonto = document.getElementById('formPonto');
    const pontoIdInput = document.getElementById('pontoId');
    const inputLat = document.getElementById('inputLat');
    const inputLng = document.getElementById('inputLng');
    const displayLat = document.getElementById('display-lat');
    const displayLng = document.getElementById('display-lng');
    const miniMapaContainer = document.getElementById('miniMapaContainer');

    // Botões Toolbar / Geral
    const btnAdicionar = document.getElementById('btnAdicionar');
    const btnEditar = document.getElementById('btnEditar');
    const btnExcluir = document.getElementById('btnExcluir');
    const campoBusca = document.getElementById('campoBusca');
    const btnCancelarModal = document.getElementById('btnCancelarModal');
    const modalFechar = document.getElementById('modalFechar');

    // Tabela Checkboxes
    const checkAll = document.getElementById('checkAll');
    const tabelaCorpo = document.getElementById('tabelaCorpo');

    // --- MECANISMO DE REFRESH TOKEN (COMPLETO) ---

    async function renovarToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return false;

        try {
            // Aponta explicitamente para o endereço do backend local
            const response = await fetch('http://127.0.0.1:5000/auth/refresh', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${refreshToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access_token);
                console.log('🔄 Access Token renovado com sucesso!');
                return true;
            }
        } catch (error) {
            console.error('Erro ao conectar na rota de refresh:', error);
        }

        console.warn('Sessão expirada ou inválida. Redirecionando para o login.');
        localStorage.clear();
        window.location.href = 'login.html';
        return false;
    }

    async function fetchAutenticado(url, configuracao = {}) {
        let token = localStorage.getItem('access_token');
        
        // Mapeia a URL para o servidor local se for uma rota relativa
        const urlCompleta = url.startsWith('http') ? url : `http://127.0.0.1:5000${url}`;
        
        configuracao.headers = configuracao.headers || {};
        if (token) {
            configuracao.headers['Authorization'] = `Bearer ${token}`;
        }

        let resposta = await fetch(urlCompleta, configuracao);

        if (resposta.status === 401) {
            const renovou = await renovarToken();
            if (renovou) {
                token = localStorage.getItem('access_token');
                configuracao.headers['Authorization'] = `Bearer ${token}`;
                resposta = await fetch(urlCompleta, configuracao);
            } else {
                // Interrompe o fluxo caso o refresh falhe
                throw new Error('Sessão expirada');
            }
        }

        return resposta;
    }

    // --- RESET DO MAPA NO FECHAMENTO DO MODAL ---

    function fecharModal() {
        modalOverlay.style.display = 'none';
        formPonto.reset();
        
        // Destrói o mapa para evitar o bug de blocos cinzas na próxima abertura
        if (mapa) {
            mapa.remove();
            mapa = null;
            marcador = null;
        }
    }

    // --- INTERFACES DO LEAFLET (FUNÇÕES) ---

    function inicializarMapa(lat, lng) {
        if (mapa) {
            mapa.setView([lat, lng], 15);
            atualizarMarcador(lat, lng);
            return;
        }

        mapa = L.map('miniMapa').setView([lat, lng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapa);

        marcador = L.marker([lat, lng], { draggable: true }).addTo(mapa);

        marcador.on('dragend', function (event) {
            const posicao = event.target.getLatLng();
            atualizarCamposCoordenadas(posicao.lat, posicao.lng);
        });

        mapa.on('click', function (event) {
            const posicao = event.latlng;
            atualizarMarcador(posicao.lat, posicao.lng);
            atualizarCamposCoordenadas(posicao.lat, posicao.lng);
        });
    }

    function atualizarMarcador(lat, lng) {
        if (marcador) {
            marcador.setLatLng([lat, lng]);
        }
    }

    function atualizarCamposCoordenadas(lat, lng) {
        const latFormatada = parseFloat(lat).toFixed(6);
        const lngFormatada = parseFloat(lng).toFixed(6);

        inputLat.value = latFormatada;
        inputLng.value = lngFormatada;
        displayLat.textContent = latFormatada;
        displayLng.textContent = lngFormatada;
    }

    // --- CONTROLE DO MODAL ---
    
    function abrirModal(isEdit = false, dados = null) {
        modalOverlay.style.display = 'flex';
        
        if (isEdit && dados) {
            modalTitulo.textContent = 'Editar Ponto de Coleta';
            pontoIdInput.value = dados.id;
            document.getElementById('inputNome').value = dados.nome;
            document.getElementById('inputEndereco').value = dados.endereco;
            document.getElementById('inputHorario').value = dados.horario;
            document.getElementById('inputDescricao').value = dados.descricao;
            
            if (dados.lat && dados.lng) {
                miniMapaContainer.style.display = 'block';
                atualizarCamposCoordenadas(dados.lat, dados.lng);
                
                setTimeout(() => {
                    inicializarMapa(dados.lat, dados.lng);
                    mapa.invalidateSize();
                }, 200);
            }
        } else {
            modalTitulo.textContent = 'Novo Ponto de Coleta';
            formPonto.reset();
            pontoIdInput.value = '';
            miniMapaContainer.style.display = 'none';
            displayLat.textContent = '-';
            displayLng.textContent = '-';
        }
    }

    function fecharModal() {
        modalOverlay.style.display = 'none';
        formPonto.reset();
    }

    btnAdicionar.addEventListener('click', () => abrirModal(false));
    btnCancelarModal.addEventListener('click', fecharModal);
    modalFechar.addEventListener('click', fecharModal);

    // --- BOTÃO LOCALIZAR ---

    const btnLocalizar = document.getElementById('btnLocalizar');
    btnLocalizar.addEventListener('click', async () => {
        const endereco = document.getElementById('inputEndereco').value;
        if (!endereco) {
            alert('Por favor, digite um endereço primeiro.');
            return;
        }

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`);
            const dados = await response.json();

            if (dados && dados.length > 0) {
                const resultado = dados[0];
                const lat = parseFloat(resultado.lat);
                const lng = parseFloat(resultado.lon);

                miniMapaContainer.style.display = 'block';
                atualizarCamposCoordenadas(lat, lng);

                setTimeout(() => {
                    inicializarMapa(lat, lng);
                    mapa.invalidateSize();
                }, 200);

            } else {
                alert('Endereço não encontrado. Selecione a posição arrastando o marcador padrão no mapa.');
                miniMapaContainer.style.display = 'block';
                setTimeout(() => {
                    inicializarMapa(padraoLat, padraoLng);
                    atualizarCamposCoordenadas(padraoLat, padraoLng);
                    mapa.invalidateSize();
                }, 200);
            }
        } catch (error) {
            console.error('Erro ao buscar endereço:', error);
            alert('Erro ao conectar ao serviço de mapas.');
        }
    });

    // --- CONTROLE DE CHECKBOXES & TOOLBAR ---

    function atualizarToolbar() {
        const selecionados = document.querySelectorAll('.row-check:checked');
        btnEditar.disabled = selecionados.length !== 1;
        btnExcluir.disabled = selecionados.length === 0;
    }

    if (checkAll) {
        checkAll.addEventListener('change', (e) => {
            const visiveis = tabelaCorpo.querySelectorAll('tr:not([style*="display: none"]) .row-check');
            visiveis.forEach(cb => cb.checked = e.target.checked);
            atualizarToolbar();
        });
    }

    tabelaCorpo.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-check')) {
            atualizarToolbar();
            if (!e.target.checked && checkAll) checkAll.checked = false;
        }
    });

    // --- AÇÃO DE EDITAR ---

    btnEditar.addEventListener('click', () => {
        const checkboxSelecionado = document.querySelector('.row-check:checked');
        if (!checkboxSelecionado) return;

        const linha = checkboxSelecionado.closest('tr');
        const id = linha.dataset.id;
        const celulas = linha.querySelectorAll('td');

        const dados = {
            id: id,
            nome: celulas[1].textContent.trim(),
            endereco: celulas[2].textContent.trim(),
            horario: celulas[3].textContent.trim(),
            descricao: celulas[4].textContent.trim() === 'Nenhum ponto cadastrado ainda.' ? '' : celulas[4].textContent.trim(),
            lat: parseFloat(linha.dataset.lat) || padraoLat,
            lng: parseFloat(linha.dataset.lng) || padraoLng
        };

        abrirModal(true, dados);
    });

    // --- EXCLUSÃO INTEGRADA COM FETCH AUTENTICADO ---

    async function excluirPontos(ids) {
        if (!confirm(`Tem certeza que deseja excluir o(s) ${ids.length} ponto(s) selecionado(s)?`)) return;

        try {
            const requisicoes = ids.map(id => 
                fetchAutenticado(`/pontos_coleta/${id}`, {
                    method: 'DELETE'
                })
            );

            const respostas = await Promise.all(requisicoes);
            const todasSucesso = respostas.every(res => res.ok);

            if (todasSucesso) {
                window.location.reload();
            } else {
                alert('Não foi possível excluir o(s) ponto(s). Certifique-se de que você é o criador deles.');
                window.location.reload();
            }
        } catch (error) {
            console.error('Erro ao deletar:', error);
            alert('Erro de comunicação com o servidor.');
        }
    }

    btnExcluir.addEventListener('click', () => {
        const selecionados = document.querySelectorAll('.row-check:checked');
        const ids = Array.from(selecionados).map(cb => cb.closest('tr').dataset.id);
        excluirPontos(ids);
    });

    tabelaCorpo.addEventListener('click', (e) => {
        const botaoExcluir = e.target.closest('.btn-excluir-linha');
        if (botaoExcluir) {
            excluirPontos([botaoExcluir.dataset.id]);
        }
    });

    // --- BUSCA DINÂMICA ---

    campoBusca.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        const linhas = tabelaCorpo.querySelectorAll('tr:not(#emptyRow)');

        linhas.forEach(linha => {
            if (linha.textContent.toLowerCase().includes(termo)) {
                linha.style.display = '';
            } else {
                linha.style.display = 'none';
                const cb = linha.querySelector('.row-check');
                if(cb) cb.checked = false;
            }
        });
        atualizarToolbar();
    });

    // --- ENVIO DO FORMULÁRIO COM REFRESH AUTOMÁTICO ---

    formPonto.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!inputLat.value || !inputLng.value) {
            alert('Por favor, localize o endereço no mapa para capturar as coordenadas.');
            return;
        }

        const id = pontoIdInput.value || null;

        const dadosForm = {
            nome: document.getElementById('inputNome').value,
            endereco: document.getElementById('inputEndereco').value,
            horario_funcionamento: document.getElementById('inputHorario').value, 
            descricao: document.getElementById('inputDescricao').value,
            latitude: parseFloat(inputLat.value),
            longitude: parseFloat(inputLng.value)
        };

        const url = id ? `/pontos_coleta/${id}` : '/pontos_coleta';
        const metodo = id ? 'PUT' : 'POST';

        try {
            // Substituído pelo fetchAutenticado que lida com o 401 e chama a sua rota /auth/refresh
            const response = await fetchAutenticado(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosForm)
            });

            if (response.ok) {
                fecharModal();
                window.location.reload();
            } else {
                const erroDados = await response.json().catch(() => ({}));
                alert(erroDados.mensagem || 'Erro ao processar requisição no servidor.');
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            alert('Erro de rede ao salvar o ponto.');
        }
    });
});