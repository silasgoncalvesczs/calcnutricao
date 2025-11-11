// Configuração de Segurança: Use sua chave API aqui.
// ATENÇÃO: Se estiver em um site público (GitHub Pages), esta chave estará visível!
// Use um serviço de proxy backend (como Netlify Functions) para produção segura.
const apiKey = "AIzaSyATeUV4-8VkKFidO2dy2Ifl_MO40aznmmE"; 

// --- Variáveis de Estado (LocalStorage Keys) ---
const HISTORY_KEY = 'nutriDiaryHistory';
const PROFILE_KEY = 'nutriDiaryProfile';

// --- Estado Global (Apenas para a Calculadora) ---
let ingredients = [];

// --- UTILITIES (Componentes Comuns) ---

// Define o HTML do Cabeçalho e do Modal de Mensagens, centralizando-o aqui.
const COMMON_COMPONENTS_HTML = (profile, pageTitle) => {
    // Determina se o botão de voltar deve aparecer
    const showBackButton = pageTitle !== 'Diário Nutricional - Início';
    const backButtonHTML = showBackButton ?
        `<a href="index.html" class="flex items-center text-white hover:text-gray-200 transition duration-150">
            <i class="fas fa-arrow-left mr-2"></i> Voltar
        </a>` : '';

    return `
    <header class="fixed top-0 left-0 w-full bg-indigo-700 shadow-md z-30 p-4">
        <div class="max-w-full mx-auto flex justify-between items-center h-12">
            
            <!-- Botão de Voltar / Título -->
            ${backButtonHTML}
            <span class="text-xl font-bold text-white">${pageTitle.replace('Diário Nutricional - ', '')}</span>

            <!-- Perfil e Menu Dropdown -->
            <div class="relative">
                <div id="profileTrigger" onclick="toggleProfileMenu()" class="flex items-center cursor-pointer space-x-2 p-1 rounded-full hover:bg-indigo-600 transition duration-150">
                    <span class="text-white font-semibold text-sm hidden sm:block">${profile.name}</span>
                    <img id="avatarImage" src="${profile.avatarUrl}" onerror="this.src='https://placehold.co/40x40/5b21b6/ffffff?text=User'" alt="Avatar" class="w-10 h-10 rounded-full object-cover border-2 border-white">
                    <i class="fas fa-ellipsis-v text-white text-lg ml-2"></i>
                </div>

                <!-- Menu Dropdown -->
                <div id="profileMenu" class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50 py-2 hidden origin-top-right transform scale-95 opacity-0 transition-all duration-200">
                    <div class="px-4 py-2 text-sm text-gray-700 font-semibold border-b">
                        Olá, ${profile.name}!
                    </div>
                    <button onclick="changeProfileName(); toggleProfileMenu()" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                        <i class="fas fa-user-edit mr-2"></i> Editar Nome
                    </button>
                    <button onclick="changeAvatarUrl(); toggleProfileMenu()" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                        <i class="fas fa-camera mr-2"></i> Mudar Avatar
                    </button>
                </div>
            </div>
        </div>
    </header>

    <div id="messageModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden" onclick="hideMessage()">
        <div class="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full" onclick="event.stopPropagation()">
            <h3 id="modalTitle" class="text-xl font-bold mb-3 text-indigo-700"></h3>
            <p id="modalMessage" class="text-gray-700 mb-4"></p>
            <button onclick="hideMessage()" class="w-full bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 transition duration-150">Fechar</button>
        </div>
    </div>
    `;
}

// Injeta o cabeçalho e o modal nas tags placeholder em qualquer página
function loadCommonComponents() {
    const profile = loadProfile();
    const pageTitle = document.title;
    
    const headerPlaceholder = document.getElementById('header-placeholder');
    const modalPlaceholder = document.getElementById('message-modal-placeholder');

    if (headerPlaceholder) {
        headerPlaceholder.innerHTML = COMMON_COMPONENTS_HTML(profile, pageTitle);
    }
    
    // O modal também faz parte dos componentes comuns
    if (modalPlaceholder) {
        // O modal já está no HTML gerado por COMMON_COMPONENTS_HTML, mas precisamos
        // garantir que ele esteja no DOM.
        // Já que ele foi injetado, vamos apenas garantir que a variável profile seja atualizada.
        renderProfile();
    }
}

// --- UTILITIES (LocalStorage e Interface) ---

function showMessage(title, message, isError = false) {
    const modal = document.getElementById('messageModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const button = modal.querySelector('button');

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    if (isError) {
        modalTitle.classList.remove('text-indigo-700');
        modalTitle.classList.add('text-red-600');
        button.classList.remove('bg-indigo-500', 'hover:bg-indigo-600');
        button.classList.add('bg-red-500', 'hover:bg-red-600');
    } else {
        modalTitle.classList.remove('text-red-600');
        modalTitle.classList.add('text-indigo-700');
        button.classList.remove('bg-red-500', 'hover:bg-red-600');
        button.classList.add('bg-indigo-500', 'hover:bg-indigo-600');
    }

    modal.classList.remove('hidden');
}

function hideMessage() {
    document.getElementById('messageModal').classList.add('hidden');
}

// --- LÓGICA DE PERFIL ---

function loadProfile() {
    const storedProfile = localStorage.getItem(PROFILE_KEY);
    return storedProfile ? JSON.parse(storedProfile) : {
        name: 'Usuário',
        avatarUrl: 'https://placehold.co/40x40/5b21b6/ffffff?text=U'
    };
}

function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    renderProfile(); // Atualiza o DOM após salvar
}

function renderProfile() {
    const profile = loadProfile();
    const avatarImg = document.getElementById('avatarImage');
    const profileTrigger = document.getElementById('profileTrigger');
    const profileMenu = document.getElementById('profileMenu');
    
    // Atualiza a barra superior
    if (profileTrigger) {
        profileTrigger.querySelector('span').textContent = profile.name;
    }

    // Atualiza a imagem em todos os lugares
    if (avatarImg) {
        avatarImg.src = profile.avatarUrl;
        avatarImg.onerror = () => {
            avatarImg.src = 'https://placehold.co/40x40/5b21b6/ffffff?text=User'; // Fallback
        };
    }
    
    // Atualiza o nome no menu suspenso
    if (profileMenu) {
        profileMenu.querySelector('.font-semibold').textContent = `Olá, ${profile.name}!`;
    }
}

function toggleProfileMenu() {
    const menu = document.getElementById('profileMenu');
    if (menu) {
        menu.classList.toggle('hidden');
        menu.classList.toggle('scale-95');
        menu.classList.toggle('opacity-0');
        menu.classList.toggle('scale-100');
        menu.classList.toggle('opacity-100');
    }
}

// Fecha o menu do perfil ao clicar fora
window.onclick = function(event) {
    const menu = document.getElementById('profileMenu');
    const trigger = document.getElementById('profileTrigger');

    if (menu && trigger && !menu.classList.contains('hidden')) {
        let target = event.target;
        // Navega para cima no DOM para verificar se o clique foi dentro do menu ou do trigger
        while (target) {
            if (target === menu || target === trigger) {
                return;
            }
            target = target.parentNode;
        }
        toggleProfileMenu(); // Fecha o menu
    }
}


function changeProfileName() {
    const profile = loadProfile();
    const newName = prompt("Insira seu novo nome de exibição:", profile.name);
    if (newName && newName.trim() !== '') {
        profile.name = newName.trim();
        saveProfile(profile);
        showMessage("Nome Atualizado", `Seu nome de exibição foi alterado para ${newName}.`);
    } else if (newName !== null) {
        showMessage("Erro", "O nome não pode ser vazio.", true);
    }
}

function changeAvatarUrl() {
    const profile = loadProfile();
    const newUrl = prompt("Insira a URL da sua nova foto de perfil:", profile.avatarUrl);
    if (newUrl && newUrl.trim() !== '') {
        profile.avatarUrl = newUrl.trim();
        saveProfile(profile);
        showMessage("Avatar Atualizado", "Sua foto de perfil foi alterada! Se a URL estiver incorreta, pode demorar para aparecer.", false);
    } else if (newUrl !== null) {
        showMessage("Erro", "A URL do avatar não pode ser vazia.", true);
    }
}

// --- LÓGICA DE HISTÓRICO (LocalStorage) ---

function getHistoryFromLocalStorage() {
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    return storedHistory ? JSON.parse(storedHistory) : [];
}

function saveHistoryToLocalStorage(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    console.log(`DEBUG: Histórico SALVO no localStorage. Novo total: ${history.length} receitas.`);
}

/**
 * Salva a receita calculada no histórico de consumo do dia atual.
 * @param {object} recipe O objeto de receita com nome e detalhes nutricionais.
 */
function addRecipeToHistory(recipe) {
    const history = getHistoryFromLocalStorage();
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });

    const newEntry = {
        ...recipe,
        date: formattedDate,
        timestamp: now.getTime(),
        // Adiciona userId para fins de estruturação, embora o localStorage seja local
        userId: 'local-user-' + loadProfile().name.replace(/\s/g, '-')
    };

    history.push(newEntry);
    saveHistoryToLocalStorage(history);
}

/**
 * Carrega e renderiza o histórico de consumo na página historico.html.
 */
function loadHistory() {
    const historyContainer = document.getElementById('historyContainer');
    const noHistoryMessage = document.getElementById('noHistoryMessage');
    
    if (!historyContainer) return; // Garante que estamos na página correta

    const history = getHistoryFromLocalStorage();
    console.log(`DEBUG: Histórico lido do localStorage (Total de itens): ${history.length}`);
    
    // Verifica a mensagem de lista vazia
    if (noHistoryMessage) {
        if (history.length === 0) {
            noHistoryMessage.classList.remove('hidden');
            historyContainer.innerHTML = '';
            return;
        } else {
            noHistoryMessage.classList.add('hidden');
        }
    }
    
    // 1. Agrupar por data
    const groupedHistory = history.reduce((acc, item) => {
        // Usa o campo 'date' que já está formatado
        const date = item.date;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(item);
        return acc;
    }, {});

    // 2. Ordenar as datas (da mais nova para a mais antiga)
    const sortedDates = Object.keys(groupedHistory).sort((a, b) => {
        // Converte DD/MM/AAAA para um formato comparável
        const dateA = new Date(a.split('/').reverse().join('-')).getTime();
        const dateB = new Date(b.split('/').reverse().join('-')).getTime();
        return dateB - dateA; // Mais recente primeiro
    });

    historyContainer.innerHTML = ''; // Limpa o conteúdo

    // 3. Renderizar
    sortedDates.forEach(date => {
        const recipes = groupedHistory[date];
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;

        // Calcular totais do dia
        recipes.forEach(recipe => {
            totalCalories += recipe.totals.calories;
            totalProtein += recipe.totals.protein;
            totalCarbs += recipe.totals.carbs;
        });

        // Título do Dia e Totais
        const dayHeader = `
            <div class="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-3 mb-3">
                    <h2 class="text-xl font-extrabold text-indigo-700">${date}</h2>
                    <div class="flex flex-wrap space-x-4 mt-2 md:mt-0 text-sm font-semibold">
                        <span class="text-red-600">${totalCalories.toFixed(0)} kcal</span>
                        <span class="text-blue-600">${totalProtein.toFixed(1)} g Prot.</span>
                        <span class="text-orange-600">${totalCarbs.toFixed(1)} g Carbo.</span>
                    </div>
                </div>
                
                <div class="space-y-4">
                    ${recipes.map(recipe => `
                        <div class="p-3 bg-gray-50 border border-gray-100 rounded-lg shadow-sm">
                            <h3 class="font-bold text-gray-800">${recipe.recipeName}</h3>
                            <p class="text-xs text-gray-500 mb-2">Registrado às ${new Date(recipe.timestamp).toLocaleTimeString('pt-BR')}</p>
                            
                            <!-- Detalhes Nutricionais da Receita -->
                            <div class="flex justify-between text-xs mt-1">
                                <span class="text-red-500 font-semibold">${recipe.totals.calories.toFixed(0)} kcal</span>
                                <span class="text-blue-500">${recipe.totals.protein.toFixed(1)}g Prot.</span>
                                <span class="text-orange-500">${recipe.totals.carbs.toFixed(1)}g Carbo.</span>
                            </div>

                            <!-- Ingredientes (Opcional, expandir se necessário) -->
                            <details class="text-sm text-gray-600 mt-2">
                                <summary class="font-medium text-gray-600 cursor-pointer hover:text-indigo-600">Ver Ingredientes (${recipe.ingredients.length})</summary>
                                <ul class="list-disc list-inside mt-2 space-y-1 p-2 bg-white rounded-md border">
                                    ${recipe.ingredients.map(ing => `<li>${ing.quantity} ${ing.unit} de ${ing.name}</li>`).join('')}
                                </ul>
                            </details>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        historyContainer.insertAdjacentHTML('beforeend', dayHeader);
    });
}

// --- LÓGICA DE CÁLCULO (API Gemini) ---

/**
 * Adiciona um ingrediente à lista e atualiza o DOM e os botões.
 */
function addIngredient() {
    const name = document.getElementById('ingredientName').value.trim();
    const quantity = parseFloat(document.getElementById('ingredientQuantity').value);
    const unit = document.getElementById('ingredientUnit').value;

    if (!name || isNaN(quantity) || quantity <= 0) {
        showMessage("Erro de Ingrediente", "Por favor, preencha o nome e a quantidade corretamente.", true);
        return;
    }

    ingredients.push({ name, quantity, unit });
    renderIngredientList();

    // Limpa o formulário
    document.getElementById('ingredientName').value = '';
    document.getElementById('ingredientQuantity').value = '';
    document.getElementById('ingredientUnit').value = 'gramas';

    // Garante que o botão de cálculo está ativo
    document.getElementById('calculateButton').disabled = false;
    document.getElementById('saveButton').disabled = true; // Desativa o salvar até calcular novamente
    document.getElementById('results').classList.add('hidden');
}

/**
 * Remove um ingrediente pelo índice e atualiza o DOM.
 * @param {number} index O índice do ingrediente na array global.
 */
function removeIngredient(index) {
    ingredients.splice(index, 1);
    renderIngredientList();

    // Desativa o salvar e os resultados
    document.getElementById('saveButton').disabled = true;
    document.getElementById('results').classList.add('hidden');
}

/**
 * Atualiza a contagem de itens na lista e renderiza os ingredientes.
 */
function renderIngredientList() {
    const listElement = document.getElementById('ingredientList');
    const countElement = document.getElementById('ingredientCount');
    const emptyMessage = document.getElementById('emptyListMessage');

    if (!listElement || !countElement || !emptyMessage) return; // Garante que estamos na página certa

    countElement.textContent = ingredients.length;

    if (ingredients.length === 0) {
        emptyMessage.classList.remove('hidden');
        document.getElementById('calculateButton').disabled = true;
        document.getElementById('saveButton').disabled = true;
        listElement.innerHTML = emptyMessage.outerHTML; // Mantém a mensagem de vazio
        return;
    }

    emptyMessage.classList.add('hidden');

    const listHtml = ingredients.map((ing, index) => `
        <div class="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-200">
            <span class="text-gray-700 font-medium">
                ${ing.name} (<span class="font-bold text-indigo-600">${ing.quantity} ${ing.unit}</span>)
            </span>
            <button onclick="removeIngredient(${index})" class="text-red-500 hover:text-red-700 transition duration-150">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');

    // Insere a lista sem a mensagem de vazio
    listElement.innerHTML = listHtml;
}


// --- LÓGICA DE API E CHAMADA ---

/**
 * Função central para fazer a chamada à API Gemini com retries.
 * @param {string} prompt O prompt de texto para o modelo.
 * @param {object} generationConfig Configuração para JSON estruturado.
 * @param {number} retries Número de tentativas restantes.
 */
async function fetchNutrientsWithRetry(prompt, generationConfig, retries = 3) {
    if (!apiKey || apiKey === "SUA_CHAVE_API_VAI_AQUI") {
        throw new Error("Chave API não configurada. Por favor, insira sua chave no script.js.");
    }
    
    // A API Gemini-2.5-flash-preview-09-2025 não suporta 'tools' e 'responseMimeType' juntos.
    // Como precisamos do JSON estruturado, vamos priorizar o JSON e usar o prompt para guiar a busca (Grounding).
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: generationConfig,
        // Remover 'tools' para permitir 'responseMimeType'
        // tools: [{ "google_search": {} }], 
    };

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 1; i <= retries; i++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                
                const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (jsonText) {
                    // A resposta JSON pode vir com quebras de linha ou caracteres extras.
                    // Tenta limpar e analisar
                    try {
                        const parsedJson = JSON.parse(jsonText);
                        return parsedJson;
                    } catch (e) {
                        console.error("Erro ao analisar o JSON retornado:", e);
                        console.error("JSON recebido:", jsonText);
                        throw new Error("Falha na análise da resposta JSON do modelo.");
                    }
                } else {
                    throw new Error("Resposta da API vazia ou inesperada.");
                }
            } else {
                const errorBody = await response.json();
                console.error("API Error Response Body:", errorBody);
                throw new Error(`A resposta da API falhou com status: ${response.status}`);
            }
        } catch (error) {
            console.error(`Tentativa ${i} falhou: ${error.message}`);
            if (i < retries) {
                // Aplica backoff exponencial: 1s, 2s, 4s...
                await delay(Math.pow(2, i) * 1000);
            } else {
                // Última tentativa falhou
                throw new Error("Falha ao obter dados nutricionais após 3 tentativas. Último erro: " + error.message);
            }
        }
    }
}

/**
 * Calcula o total de calorias, proteínas e carboidratos de todos os ingredientes.
 */
async function calculateTotal() {
    document.getElementById('calculateButton').disabled = true;
    document.getElementById('saveButton').disabled = true;
    document.getElementById('results').classList.add('hidden');

    const loadingElement = document.createElement('div');
    loadingElement.id = 'loadingSpinner';
    loadingElement.className = 'flex justify-center items-center mt-6 p-4 bg-white rounded-xl shadow-md';
    loadingElement.innerHTML = `
        <i class="fas fa-spinner fa-spin text-indigo-500 text-2xl mr-3"></i>
        <span class="text-indigo-700 font-semibold">Calculando nutrição da receita...</span>
    `;
    document.getElementById('main-content').querySelector('.max-w-xl').appendChild(loadingElement);

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let failedIngredients = [];
    let successfulIngredients = []; // Lista para salvar no histórico

    // Schema JSON para garantir que o modelo retorne dados estruturados
    const nutrientSchema = {
        responseMimeType: "application/json",
        responseSchema: {
            type: "OBJECT",
            properties: {
                "calories": { "type": "NUMBER", "description": "Total de calorias (kcal), arredondado." },
                "protein": { "type": "NUMBER", "description": "Total de proteína em gramas (g), com uma casa decimal." },
                "carbs": { "type": "NUMBER", "description": "Total de carboidratos em gramas (g), com uma casa decimal." }
            },
            propertyOrdering: ["calories", "protein", "carbs"]
        }
    };

    for (const ing of ingredients) {
        const prompt = `Como um nutricionista, encontre os dados nutricionais e calcule o total de calorias, proteína e carboidratos para ${ing.quantity} ${ing.unit} de ${ing.name}. Considere apenas o macronutriente principal. Retorne apenas o JSON.`;
        
        try {
            const nutrientData = await fetchNutrientsWithRetry(prompt, nutrientSchema);

            // Validação básica do retorno
            if (nutrientData && typeof nutrientData.calories === 'number') {
                totalCalories += nutrientData.calories;
                totalProtein += nutrientData.protein;
                totalCarbs += nutrientData.carbs;
                
                successfulIngredients.push({
                    name: ing.name,
                    quantity: ing.quantity,
                    unit: ing.unit,
                    macros: nutrientData
                });

            } else {
                failedIngredients.push(ing.name);
                console.error(`Falha na validação dos dados para ${ing.name}:`, nutrientData);
            }

        } catch (error) {
            failedIngredients.push(ing.name);
            console.error(`Erro ao buscar dados para ${ing.name}:`, error);
        }
    }
    
    // Remove o spinner de carregamento
    loadingElement.remove();

    // Atualiza o DOM com os totais
    document.getElementById('totalCalories').textContent = totalCalories.toFixed(0);
    document.getElementById('totalProtein').textContent = totalProtein.toFixed(1) + ' g';
    document.getElementById('totalCarbs').textContent = totalCarbs.toFixed(1) + ' g';
    document.getElementById('results').classList.remove('hidden');

    // Habilita/desabilita botões e mostra mensagens de erro
    document.getElementById('calculateButton').disabled = false;
    
    if (successfulIngredients.length > 0) {
        document.getElementById('saveButton').disabled = false;
        
        // Define o estado global da receita calculada para que o botão 'Salvar' possa usá-lo
        window.currentCalculatedRecipe = {
            recipeName: ingredients.length > 1 ? 'Nova Receita' : successfulIngredients[0].name,
            ingredients: successfulIngredients,
            totals: {
                calories: totalCalories,
                protein: totalProtein,
                carbs: totalCarbs
            }
        };

        if (failedIngredients.length > 0) {
            showMessage("Aviso de Cálculo", `Não foi possível obter dados para: ${failedIngredients.join(', ')}. Os valores exibidos são parciais.`, false);
        } else {
            showMessage("Cálculo Concluído", "A análise nutricional da sua receita foi concluída com sucesso!");
        }
        
    } else {
        document.getElementById('saveButton').disabled = true;
        showMessage("Erro de Cálculo", "Não foi possível obter dados para nenhum ingrediente. Por favor, verifique a grafia ou tente novamente mais tarde.", true);
    }
}

/**
 * Pede o nome da receita e a salva no histórico.
 */
function saveRecipePrompt() {
    if (!window.currentCalculatedRecipe) {
        showMessage("Erro", "Nenhuma receita calculada para salvar.", true);
        return;
    }

    const defaultName = window.currentCalculatedRecipe.recipeName;
    const recipeName = prompt("Insira o nome desta receita:", defaultName);

    if (recipeName && recipeName.trim() !== '') {
        window.currentCalculatedRecipe.recipeName = recipeName.trim();
        addRecipeToHistory(window.currentCalculatedRecipe);
        showMessage("Receita Gravada", `A receita "${recipeName}" foi registrada no seu histórico de consumo!`);
        
        // Redireciona para o histórico após 1.5s
        setTimeout(() => {
            window.location.href = 'historico.html';
        }, 1500);
        
    } else if (recipeName !== null) {
        showMessage("Aviso", "A receita não foi salva pois você cancelou ou deixou o nome vazio.");
    }
}

// --- INICIALIZAÇÃO DA APLICAÇÃO ---

function initApp() {
    loadCommonComponents(); // Injeta o cabeçalho e o modal
    
    // Roda a lógica específica de cada página
    const currentPage = document.title;
    
    if (currentPage.includes('Calculadora')) {
        renderIngredientList(); // Inicializa a lista de ingredientes (e botões)
    } else if (currentPage.includes('Histórico')) {
        loadHistory(); // Carrega e renderiza o histórico
    }
    
    // Adiciona listener global para fechar o menu ao iniciar
    document.addEventListener('click', (event) => {
        const menu = document.getElementById('profileMenu');
        const trigger = document.getElementById('profileTrigger');

        if (menu && trigger && !menu.classList.contains('hidden')) {
            // Verifica se o clique foi fora do menu e do trigger
            if (!trigger.contains(event.target) && !menu.contains(event.target)) {
                 toggleProfileMenu();
            }
        }
    });

}

// Inicializa o aplicativo quando o DOM estiver completamente carregado
document.addEventListener('DOMContentLoaded', initApp);