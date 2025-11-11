/*
 * Diário Nutricional - script.js
 * Lógica centralizada para perfil, navegação, cálculo e histórico.
 */

// -----------------------------------------------------------------------------
// CHAVE DE API (Substitua pela sua chave)
// -----------------------------------------------------------------------------
// AVISO DE SEGURANÇA: Não exponha esta chave publicamente (ex: GitHub Pages).
// Use um proxy de backend (ex: Netlify/Vercel Functions) para produção.
const apiKey = "AIzaSyATeUV4-8VkKFidO2dy2Ifl_MO40aznmmE"; 
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// ESTADO GLOBAL E VARIÁVEIS
// -----------------------------------------------------------------------------
let ingredients = []; // Array de ingredientes da receita atual
let currentTotals = null; // Armazena os totais após o cálculo

// -----------------------------------------------------------------------------
// INICIALIZAÇÃO (Correr em todas as páginas)
// -----------------------------------------------------------------------------

/**
 * Ponto de entrada principal. É executado quando o DOM está pronto.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Carrega componentes comuns (Header, Modal) em todas as páginas
    loadCommonComponents();

    // Inicializa a lógica específica da página atual
    const pageId = document.body.querySelector('main')?.id;

    switch (pageId) {
        case 'home-screen':
            // Atualmente, a home não precisa de JS específico além do comum
            break;
        case 'calculator-screen':
            initCalculator();
            break;
        case 'history-screen':
            loadHistory();
            break;
    }
});

/**
 * Injeta o HTML do Header e do Modal no DOM.
 * Centraliza a lógica de perfil e navegação.
 */
function loadCommonComponents() {
    const headerPlaceholder = document.getElementById('main-header-placeholder');
    const modalPlaceholder = document.getElementById('modal-placeholder');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // 1. HTML do Header
    if (headerPlaceholder) {
        const headerHtml = `
            <div class="w-full bg-purple-700 text-white shadow-md fixed top-0 left-0 z-50">
                <div class="max-w-5xl mx-auto p-3 flex justify-between items-center">
                    <!-- Botão Voltar (se não estiver na Home) -->
                    ${currentPage !== 'index.html' ? `
                    <a href="index.html" class="text-white hover:bg-purple-600 p-2 rounded-full transition-colors">
                        <i class="fas fa-arrow-left"></i>
                    </a>
                    ` : `<div></div>`}

                    <!-- Título -->
                    <h1 class="text-xl font-bold">${document.title.split('-')[0].trim()}</h1>

                    <!-- Perfil do Utilizador -->
                    <div class="relative">
                        <button id="profileButton" class="flex items-center space-x-2 hover:bg-purple-600 p-2 rounded-lg transition-colors">
                            <span id="profileNameDisplay" class="text-sm font-medium hidden sm:block">Utilizador</span>
                            <img id="profileAvatarDisplay" src="https://placehold.co/40x40/E9D5FF/6B21A8?text=P" class="w-8 h-8 rounded-full border-2 border-purple-300 object-cover">
                            <i class="fas fa-ellipsis-v text-sm sm:ml-2"></i>
                        </button>
                        
                        <!-- Menu Dropdown do Perfil (escondido) -->
                        <div id="profileMenu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                            <button id="editNameBtn" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Editar Nome</button>
                            <button id="editAvatarBtn" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Mudar Avatar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        headerPlaceholder.innerHTML = headerHtml;
    }

    // 2. HTML do Modal (ATUALIZADO com botões de confirmação)
    if (modalPlaceholder) {
        const modalHtml = `
            <div id="messageModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                    <h3 id="modalTitle" class="text-xl font-bold text-gray-800"></h3>
                    <p id="modalMessage" class="text-gray-600 mt-2 mb-4"></p>
                    
                    <!-- Botão de Fechar Padrão (para showMessage) -->
                    <div id="modal-close-button" class="flex justify-end">
                        <button id="modalCloseBtn" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">Fechar</button>
                    </div>

                    <!-- Botões de Confirmação (para showConfirmationModal) -->
                    <div id="modal-confirm-buttons" class="hidden flex justify-end gap-3 mt-4">
                        <button id="modalCancelBtn" class="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors">Cancelar</button>
                        <button id="modalConfirmBtn" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">Confirmar</button>
                    </div>
                </div>
            </div>
        `;
        modalPlaceholder.innerHTML = modalHtml;
    }

    // 3. Adiciona Listeners para os componentes comuns
    initCommonListeners();
    // 4. Carrega os dados do perfil (Nome/Avatar)
    loadProfile();
}

/**
 * Adiciona listeners aos elementos comuns (Perfil, Modal).
 */
function initCommonListeners() {
    // Modal
    const modal = document.getElementById('messageModal');
    const closeBtn = document.getElementById('modalCloseBtn');
    
    // O botão de fechar padrão (roxo)
    if (modal && closeBtn) {
        closeBtn.onclick = () => modal.classList.add('hidden');
    }

    // Perfil
    const profileButton = document.getElementById('profileButton');
    const profileMenu = document.getElementById('profileMenu');
    const editNameBtn = document.getElementById('editNameBtn');
    const editAvatarBtn = document.getElementById('editAvatarBtn');

    if (profileButton && profileMenu) {
        profileButton.onclick = (e) => {
            // Evita que o 'window.onclick' feche o menu imediatamente
            e.stopPropagation();
            profileMenu.classList.toggle('hidden');
        };
    }

    if (editNameBtn) editNameBtn.onclick = changeProfileName;
    if (editAvatarBtn) editAvatarBtn.onclick = changeAvatarUrl;

    // Fecha o menu de perfil se clicar fora
    window.onclick = (e) => {
        if (profileMenu && !profileMenu.classList.contains('hidden')) {
            // Se o clique NÃO foi no botão que abre o menu
            if (!profileButton.contains(e.target)) {
                profileMenu.classList.add('hidden');
            }
        }
    };
}


// -----------------------------------------------------------------------------
// LÓGICA DE PERFIL (localStorage)
// -----------------------------------------------------------------------------
const PROFILE_KEY = 'nutriDiaryProfile';

/**
 * Obtém os dados do perfil (nome/avatar) do localStorage.
 */
function getProfile() {
    const defaultProfile = {
        name: 'Utilizador',
        avatar: 'https://placehold.co/40x40/E9D5FF/6B21A8?text=P'
    };
    try {
        const stored = localStorage.getItem(PROFILE_KEY);
        return stored ? JSON.parse(stored) : defaultProfile;
    } catch (e) {
        console.error("Erro ao ler perfil do localStorage", e);
        return defaultProfile;
    }
}

/**
 * Salva o objeto do perfil no localStorage.
 */
function saveProfile(profile) {
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
        console.error("Erro ao guardar perfil no localStorage", e);
    }
}

/**
 * Carrega o perfil e o renderiza no header.
 */
function loadProfile() {
    const profile = getProfile();
    renderProfile(profile);
}

/**
 * Renderiza o nome e o avatar no header.
 */
function renderProfile(profile) {
    const nameDisplay = document.getElementById('profileNameDisplay');
    const avatarDisplay = document.getElementById('profileAvatarDisplay');
    
    if (nameDisplay) nameDisplay.textContent = profile.name;
    if (avatarDisplay) {
        avatarDisplay.src = profile.avatar;
        // Fallback de imagem
        avatarDisplay.onerror = () => {
            avatarDisplay.src = 'https://placehold.co/40x40/E9D5FF/6B21A8?text=P';
            // Opcional: reverte para o avatar padrão se o URL falhar
            // profile.avatar = defaultProfile.avatar;
            // saveProfile(profile);
        };
    }
}

/**
 * Pede e salva um novo nome de perfil.
 */
function changeProfileName() {
    const profile = getProfile();
    const newName = prompt("Qual é o seu nome?", profile.name);
    if (newName && newName.trim() !== '') {
        profile.name = newName.trim();
        saveProfile(profile);
        renderProfile(profile);
        showMessage("Sucesso", "Nome de perfil atualizado!");
    }
    document.getElementById('profileMenu')?.classList.add('hidden');
}

/**
 * Pede e salva um novo URL de avatar.
 */
function changeAvatarUrl() {
    const profile = getProfile();
    const newUrl = prompt("Insira o URL da sua nova imagem de avatar:", profile.avatar);
    if (newUrl && newUrl.trim() !== '') {
        // Validação simples de URL (deve começar com http)
        if (newUrl.trim().startsWith('http://') || newUrl.trim().startsWith('https://')) {
            profile.avatar = newUrl.trim();
            saveProfile(profile);
            renderProfile(profile);
            showMessage("Sucesso", "Avatar atualizado!");
        } else {
            showMessage("Erro de URL", "Por favor, insira um URL válido que comece com http:// ou https://");
        }
    }
    document.getElementById('profileMenu')?.classList.add('hidden');
}


// -----------------------------------------------------------------------------
// LÓGICA DA CALCULADORA
// -----------------------------------------------------------------------------

/**
 * Inicializa os listeners da página da calculadora.
 */
function initCalculator() {
    // Liga os botões aos seus handlers
    document.getElementById('addIngredientBtn')?.addEventListener('click', addIngredient);
    document.getElementById('calculateBtn')?.addEventListener('click', calculateTotal);
    document.getElementById('saveBtn')?.addEventListener('click', saveRecipeToHistory);
    
    // Renderiza a lista inicial (vazia)
    renderIngredientList();
}

/**
 * Adiciona um ingrediente à lista 'ingredients'.
 */
function addIngredient() {
    const nameInput = document.getElementById('ingredientName');
    const quantityInput = document.getElementById('ingredientQuantity');
    const unitSelect = document.getElementById('ingredientUnit');

    const name = nameInput.value.trim();
    const quantityRaw = quantityInput.value.trim();
    const quantity = parseFloat(quantityRaw);
    const unit = unitSelect.value;

    // --- Validação Melhorada ---
    if (!name) {
        showMessage('Erro de Validação', 'Por favor, insira o nome do ingrediente.');
        return;
    }
    if (!quantityRaw) {
         showMessage('Erro de Validação', 'Por favor, insira a quantidade.');
         return;
    }
    if (isNaN(quantity) || quantity <= 0) {
        showMessage('Erro de Validação', 'A quantidade deve ser um número positivo.');
        return;
    }
    // --- Fim da Validação ---

    ingredients.push({ name, quantity, unit });
    
    // Atualiza a UI
    renderIngredientList();
    resetCalculatorInputs(nameInput, quantityInput, unitSelect);
    
    // Força o recálculo
    disableSaveButton();
}

/**
 * Renderiza a lista de ingredientes no DOM.
 */
function renderIngredientList() {
    const listElement = document.getElementById('ingredientList');
    const countElement = document.getElementById('ingredientCount');
    if (!listElement) return;

    if (ingredients.length === 0) {
        listElement.innerHTML = `<p id="emptyListMessage" class="text-center text-gray-500 py-4">Nenhum ingrediente adicionado.</p>`;
    } else {
        const listHtml = ingredients.map((item, index) => `
            <div class="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-200 animate-fade-in">
                <span class="text-gray-700">${item.name} (<span class="text-purple-600 font-medium">${item.quantity} ${item.unit}</span>)</span>
                
                <!-- Botão de Excluir -->
                <button onclick="removeIngredient(${index})" class="text-red-500 hover:text-red-700 transition-colors duration-200 cursor-pointer p-1">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
        listElement.innerHTML = listHtml;
    }

    if (countElement) {
        countElement.textContent = ingredients.length;
    }
}

/**
 * Remove um ingrediente da lista pelo seu índice.
 */
function removeIngredient(index) {
    // Confirmação (opcional, mas boa prática)
    // const item = ingredients[index];
    // if (!confirm(`Tem a certeza que quer remover "${item.name}"?`)) {
    //     return;
    // }

    ingredients.splice(index, 1); // Remove o item do array
    renderIngredientList(); // Re-renderiza a lista
    disableSaveButton(); // Força o recálculo
}

/**
 * Reseta os campos de input da calculadora.
 */
function resetCalculatorInputs(nameInput, quantityInput, unitSelect) {
    if (nameInput) nameInput.value = '';
    if (quantityInput) quantityInput.value = '100';
    if (unitSelect) unitSelect.value = 'g (gramas)';
    if (nameInput) nameInput.focus();
}

/**
 * Desativa o botão 'Gravar' e esconde os totais (força recálculo).
 */
function disableSaveButton() {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.setAttribute('disabled', 'true');
    }
    document.getElementById('totalsResult')?.classList.add('hidden');
    currentTotals = null;
}

/**
 * Inicia o processo de cálculo dos nutrientes totais.
 */
async function calculateTotal() {
    if (ingredients.length === 0) {
        showMessage('Lista Vazia', 'Adicione pelo menos um ingrediente antes de calcular.');
        return;
    }

    if (!apiKey || apiKey === "SUA_CHAVE_API_VAI_AQUI") {
        showMessage('Erro de Configuração', 'A chave API (apiKey) não foi configurada no script.js. O cálculo não pode prosseguir.');
        return;
    }

    const calculateBtn = document.getElementById('calculateBtn');
    const originalBtnHtml = calculateBtn.innerHTML;
    calculateBtn.innerHTML = `<i class="fas fa-spinner animate-spin mr-2"></i>A calcular...`;
    calculateBtn.setAttribute('disabled', 'true');

    try {
        // Usamos JSON estruturado para obter dados da API
        const { nutrients, errors } = await fetchNutrientsBatch(ingredients);

        if (errors.length > 0) {
            showMessage('Erro de Cálculo', `Não foi possível obter dados para: ${errors.join(', ')}. Tente verificar a ortografia.`);
        }

        if (nutrients.length > 0) {
            // Calcula os totais
            const totals = nutrients.reduce((acc, item) => ({
                calories: acc.calories + item.calories,
                protein: acc.protein + item.protein,
                carbs: acc.carbs + item.carbs
            }), { calories: 0, protein: 0, carbs: 0 });

            // Armazena os totais para salvar
            currentTotals = totals;
            
            // Exibe os totais
            displayTotals(totals);
            document.getElementById('saveBtn')?.removeAttribute('disabled');
        }
    } catch (error) {
        console.error("Erro na função calculateTotal:", error);
        showMessage('Erro de API', `Ocorreu um erro ao contactar a API: ${error.message}. Verifique o console para detalhes.`);
    } finally {
        // Restaura o botão
        calculateBtn.innerHTML = originalBtnHtml;
        calculateBtn.removeAttribute('disabled');
    }
}

/**
 * Busca os nutrientes de todos os ingredientes em lote.
 */
async function fetchNutrientsBatch(ingredientList) {
    const nutrients = [];
    const errors = [];

    // --- CORREÇÃO: Prompt do sistema atualizado para solicitar um ARRAY JSON ---
    const systemPrompt = `
        Aja como um nutricionista assistente. O utilizador fornecerá uma lista de ingredientes.
        Para CADA ingrediente, calcule as calorias totais, proteínas totais (em gramas) e carboidratos totais (em gramas).
        Baseie-se em dados nutricionais padrão (ex: USDA).
        Responda APENAS com um ARRAY JSON (uma lista), onde cada objeto corresponde a um ingrediente na ordem em que foi dado.
        Formato de cada objeto no array: {"ingredient": "nome", "calories": [valor], "protein": [valor], "carbs": [valor]}.
        Se um ingrediente não for reconhecido (ex: "comida de fadas"), retorne 0 para todos os campos desse item.
        Não use markdown \`\`\`json. A resposta deve começar com [ e terminar com ].
    `;

    // --- CORREÇÃO: Query do usuário atualizada para reforçar o pedido do ARRAY ---
    const userQuery = "Calcule os nutrientes para a seguinte lista de ingredientes (retorne um array JSON):\n" +
                      ingredientList.map(item => `- ${item.name}: ${item.quantity} ${item.unit}`).join('\n');

    // --- Payload corrigido (sem generationConfig) ---
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        // Ferramenta de Google Search para grounding (obter dados da web)
        tools: [{ "google_search": {} }]
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            // Tenta ler o corpo do erro para mais detalhes
            const errorBody = await response.json().catch(() => ({}));
            console.error("API Error Response Body:", errorBody);
            throw new Error(`A resposta da API falhou com status: ${response.status}`);
        }

        const result = await response.json();
        
        // Tenta extrair o texto da resposta
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
            throw new Error("A resposta da API estava vazia ou mal formatada.");
        }

        let jsonString = responseText.trim();
        // Tenta limpar o markdown (embora o prompt peça para não o usar)
        if (jsonString.startsWith('```')) {
            const match = jsonString.match(/```json\n([\s\S]*?)\n```/);
            jsonString = match && match[1] ? match[1].trim() : jsonString.replace(/```json|```/g, '').trim();
        }

        // --- CORREÇÃO: Verificar se a resposta é um ARRAY ---
        if (!jsonString.startsWith('[')) {
            throw new Error("A resposta da API não continha um array JSON válido.");
        }
        
        const parsedData = JSON.parse(jsonString);
        // --- CORREÇÃO: A resposta parseada é o próprio array de resultados ---
        const apiResults = parsedData;

        console.log("DEBUG: Resposta da API (parseada):", apiResults);

        // Mapeia os resultados da API de volta para a nossa lista de ingredientes
        ingredientList.forEach((originalItem, index) => {
            const apiData = apiResults[index]; // Esta linha não deve mais falhar
            if (apiData && (apiData.calories > 0 || apiData.protein > 0 || apiData.carbs > 0)) {
                nutrients.push({
                    name: originalItem.name, // Mantém o nome original
                    calories: apiData.calories || 0,
                    protein: apiData.protein || 0,
                    carbs: apiData.carbs || 0
                });
            } else {
                // Se a API retornou 0 ou dados inválidos, marca como erro
                errors.push(originalItem.name);
            }
        });

        return { nutrients, errors };

    } catch (error) {
        console.error("Erro em fetchNutrientsBatch:", error.message);
        throw error; // Repassa o erro para a 'calculateTotal'
    }
}


/**
 * Exibe os totais calculados na interface.
 */
function displayTotals(totals) {
    document.getElementById('totalCalories').textContent = totals.calories.toFixed(0);
    document.getElementById('totalProtein').textContent = `${totals.protein.toFixed(1)} g`;
    document.getElementById('totalCarbs').textContent = `${totals.carbs.toFixed(1)} g`;
    
    document.getElementById('totalsResult')?.classList.remove('hidden');
}


// -----------------------------------------------------------------------------
// LÓGICA DE HISTÓRICO (localStorage)
// -----------------------------------------------------------------------------
const HISTORY_KEY = 'nutriDiaryHistory';

/**
 * Obtém o histórico (array) do localStorage.
 */
function getHistoryFromLocalStorage() {
    try {
        const stored = localStorage.getItem(HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Erro ao ler histórico do localStorage", e);
        return [];
    }
}

/**
 * Salva o histórico (array) no localStorage.
 */
function saveHistoryToLocalStorage(history) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error("Erro ao guardar histórico no localStorage", e);
    }
}

/**
 * Salva a receita atual (ingredientes + totais) no histórico.
 */
function saveRecipeToHistory() {
    if (!currentTotals || ingredients.length === 0) {
        showMessage('Erro', 'Calcule os totais antes de gravar. Se alterou a lista, recalcule.');
        return;
    }
    
    // Pede um nome para a refeição
    const recipeName = prompt("Dê um nome a esta refeição (ex: 'Pequeno-almoço', 'Lasanha')", "Refeição");
    if (!recipeName) return; // Utilizador cancelou

    const history = getHistoryFromLocalStorage();
    const newEntry = {
        id: Date.now(), // ID único
        name: recipeName,
        date: new Date().toISOString(), // Data em formato ISO (para agrupar)
        totals: currentTotals,
        ingredients: [...ingredients] // Salva uma cópia dos ingredientes
    };

    history.push(newEntry);
    saveHistoryToLocalStorage(history);
    console.log(`DEBUG: Histórico SALVO no localStorage. Novo total: ${history.length}`);

    // Feedback e redirecionamento
    showMessage('Sucesso!', 'Refeição gravada no seu histórico.');

    // Reseta a calculadora
    ingredients = [];
    currentTotals = null;
    renderIngredientList();
    disableSaveButton();

    // Opcional: Redireciona para o histórico após salvar
    setTimeout(() => {
        window.location.href = 'historico.html';
    }, 1500); // Espera 1.5s após a mensagem de sucesso
}

/**
 * Carrega e renderiza o histórico na página de histórico.
 */
function loadHistory() {
    const history = getHistoryFromLocalStorage();
    const container = document.getElementById('historyListContainer');
    const noHistoryMessage = document.getElementById('noHistoryMessage');

    console.log(`DEBUG: Histórico lido do localStorage (Total de itens): ${history.length}`);

    if (!container || !noHistoryMessage) {
        console.error("Elemento 'historyListContainer' ou 'noHistoryMessage' não encontrado.");
        return;
    }

    if (history.length === 0) {
        noHistoryMessage.classList.remove('hidden');
        container.classList.add('hidden');
        return;
    }

    noHistoryMessage.classList.add('hidden');
    container.classList.remove('hidden');

    // 1. Agrupa o histórico por dia
    const groupedByDay = history.reduce((acc, entry) => {
        const entryDate = new Date(entry.date);
        // Formata a data como "Quinta-feira, 10 de Novembro"
        const dayKey = entryDate.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        if (!acc[dayKey]) {
            acc[dayKey] = {
                dateObj: entryDate,
                entries: [],
                totals: { calories: 0, protein: 0, carbs: 0 }
            };
        }
        
        acc[dayKey].entries.push(entry);
        acc[dayKey].totals.calories += entry.totals.calories;
        acc[dayKey].totals.protein += entry.totals.protein;
        acc[dayKey].totals.carbs += entry.totals.carbs;
        
        return acc;
    }, {});

    // 2. Ordena os dias (do mais recente para o mais antigo)
    const sortedDays = Object.keys(groupedByDay).sort((a, b) => {
        return groupedByDay[b].dateObj - groupedByDay[a].dateObj;
    });

    // 3. Renderiza o HTML
    container.innerHTML = sortedDays.map(dayKey => {
        const dayData = groupedByDay[dayKey];
        
        return `
            <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <!-- Cabeçalho do Dia (com totais) -->
                <div class="bg-gray-50 p-4 border-b border-gray-200">
                    <h3 class="text-lg font-bold text-purple-700">${dayKey}</h3>
                    <!-- Totais do Dia -->
                    <div class="grid grid-cols-3 gap-2 mt-2 text-center">
                        <div>
                            <span class="block text-xs text-gray-500">Total Calorias</span>
                            <span class="text-md font-semibold text-gray-800">${dayData.totals.calories.toFixed(0)}</span>
                        </div>
                        <div>
                            <span class="block text-xs text-gray-500">Total Proteínas</span>
                            <span class="text-md font-semibold text-gray-800">${dayData.totals.protein.toFixed(1)} g</span>
                        </div>
                        <div>
                            <span class="block text-xs text-gray-500">Total Carboidratos</span>
                            <span class="text-md font-semibold text-gray-800">${dayData.totals.carbs.toFixed(1)} g</span>
                        </div>
                    </div>
                </div>
                
                <!-- Lista de Refeições do Dia -->
                <div class="divide-y divide-gray-200">
                    ${dayData.entries.sort((a,b) => new Date(b.date) - new Date(a.date)).map(entry => `
                        <div class="p-4">
                            <div class="flex justify-between items-center mb-2">
                                <div>
                                    <span class="font-semibold text-gray-700">${entry.name}</span>
                                    <span class="text-sm text-gray-500 ml-2">${new Date(entry.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <!-- ATUALIZAÇÃO: Botão de Excluir -->
                                <button onclick="promptDeleteHistoryItem(${entry.id})" class="text-red-500 hover:text-red-700 transition-colors p-1" aria-label="Excluir refeição">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                            <!-- Detalhes da Refeição (Macros) -->
                            <div class="grid grid-cols-3 gap-2 text-center text-sm">
                                <div>
                                    <span class="block text-xs text-gray-500">Calorias</span>
                                    <span class="font-medium text-gray-700">${entry.totals.calories.toFixed(0)}</span>
                                </div>
                                <div>
                                    <span class="block text-xs text-gray-500">Proteínas</span>
                                    <span class="font-medium text-gray-700">${entry.totals.protein.toFixed(1)} g</span>
                                </div>
                                <div>
                                    <span class="block text-xs text-gray-500">Carboidratos</span>
                                    <span class="font-medium text-gray-700">${entry.totals.carbs.toFixed(1)} g</span>
                                </div>
                            </div>
                            <!-- Opcional: Ver ingredientes (pode ser um toggle) -->
                            <!--
                            <details class="mt-2 text-sm">
                                <summary class="cursor-pointer text-blue-600">Ver ingredientes</summary>
                                <ul class="list-disc list-inside pl-2 mt-1 text-gray-600">
                                    ${entry.ingredients.map(ing => `<li>${ing.name} (${ing.quantity} ${ing.unit})</li>`).join('')}
                                </ul>
                            </details>
                            -->
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * ATUALIZAÇÃO: Mostra o modal de confirmação para excluir um item.
 */
function promptDeleteHistoryItem(entryId) {
    const history = getHistoryFromLocalStorage();
    const entry = history.find(e => e.id === entryId);
    
    if (!entry) {
        console.error("Não foi possível encontrar o item de histórico para excluir.");
        return;
    }

    // Mostra o modal de confirmação
    showConfirmationModal(
        'Confirmar Exclusão',
        `Tem certeza que deseja excluir a refeição "${entry.name}"? Esta ação não pode ser desfeita.`,
        () => {
            deleteHistoryItem(entryId);
        }
    );
}

/**
 * ATUALIZAÇÃO: Exclui o item do localStorage e recarrega a lista.
 */
function deleteHistoryItem(entryId) {
    let history = getHistoryFromLocalStorage();
    history = history.filter(e => e.id !== entryId); // Filtra o array
    saveHistoryToLocalStorage(history); // Salva o novo array
    
    // Recarrega a visualização do histórico
    loadHistory(); 

    // Feedback
    showMessage("Sucesso", "A refeição foi excluída do seu histórico.");
}


// -----------------------------------------------------------------------------
// FUNÇÕES UTILITÁRIAS (ex: Modal)
// -----------------------------------------------------------------------------

/**
 * Exibe o modal de mensagens (Modo Informativo).
 * @param {string} title Título do modal.
 * @param {string} message Mensagem do modal.
 */
function showMessage(title, message) {
    const modal = document.getElementById('messageModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const closeBtnDiv = document.getElementById('modal-close-button');
    const confirmBtnsDiv = document.getElementById('modal-confirm-buttons');

    if (modal && modalTitle && modalMessage && closeBtnDiv && confirmBtnsDiv) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;

        // Mostra o botão "Fechar" e esconde os de "Confirmar"
        closeBtnDiv.classList.remove('hidden');
        confirmBtnsDiv.classList.add('hidden');
        
        modal.classList.remove('hidden');
    } else {
        // Fallback (nunca deve acontecer se o DOM estiver correto)
        console.error("Componentes do modal não encontrados!");
        alert(`${title}: ${message}`);
    }
}

/**
 * ATUALIZAÇÃO: Exibe o modal de mensagens (Modo Confirmação).
 * @param {string} title Título do modal.
 *Por favor, substitua o conteúdo dos seus arquivos `historico.html` e `script.js` por estas novas versões. Os arquivos `index.html` e `calculadora.html` não precisam de alterações.
 * @param {function} onConfirmCallback Função a ser chamada se o utilizador confirmar.
 */
function showConfirmationModal(title, message, onConfirmCallback) {
    const modal = document.getElementById('messageModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const closeBtnDiv = document.getElementById('modal-close-button');
    const confirmBtnsDiv = document.getElementById('modal-confirm-buttons');
    const cancelBtn = document.getElementById('modalCancelBtn');
    const confirmBtn = document.getElementById('modalConfirmBtn');

    if (!modal || !modalTitle || !modalMessage || !closeBtnDiv || !confirmBtnsDiv || !cancelBtn || !confirmBtn) {
        console.error("Componentes do modal de confirmação não encontrados!");
        return;
    }

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Mostra os botões "Confirmar" e esconde o "Fechar"
    closeBtnDiv.classList.add('hidden');
    confirmBtnsDiv.classList.remove('hidden');

    // Remove listeners antigos e define os novos (importante para o callback)
    // Usamos .cloneNode e .replaceWith para garantir que NENHUM listener antigo permaneça
    const newConfirmBtn = confirmBtn.cloneNode(true);
    newConfirmBtn.textContent = "Confirmar"; // Garante o texto
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.onclick = () => {
        modal.classList.add('hidden');
        if (onConfirmCallback) {
            onConfirmCallback(); // Executa a ação de exclusão
        }
    };

    cancelBtn.onclick = () => {
        modal.classList.add('hidden');
    };

    modal.classList.remove('hidden');
}

// Fim do script.js