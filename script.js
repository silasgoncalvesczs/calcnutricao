// Variáveis de ambiente
// ATENÇÃO DE SEGURANÇA CRÍTICA: Se estiver executando este código localmente,
// você DEVE inserir sua chave API da Google no lugar das aspas vazias ("").
// ESTA CHAVE SERÁ PÚBLICA EM QUALQUER SITE ESTÁTICO (ex: GitHub Pages).
const apiKey = "AIzaSyATeUV4-8VkKFidO2dy2Ifl_MO40aznmmE"; // <--- SUBSTITUA POR SUA CHAVE REAL APENAS PARA TESTE LOCAL!
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

// Variáveis de estado global (apenas para a página calculadora)
let ingredients = [];

// --- Configuração da UI (Acesso aos elementos da página atual) ---
// Elementos da Calculadora (podem ser null nas outras páginas)
const ingredientNameInput = document.getElementById('ingredientName');
const quantityInput = document.getElementById('quantity');
const unitSelect = document.getElementById('unit');
const ingredientListDiv = document.getElementById('ingredientList');
const calculateButton = document.getElementById('calculateButton');
const resultsSection = document.getElementById('resultsSection');
const noIngredientsMessage = document.getElementById('noIngredientsMessage');

// Elementos do Histórico (podem ser null nas outras páginas)
const historyListDiv = document.getElementById('historyList');

// Elementos Comuns
const profileMenu = document.getElementById('profileMenu');
const messageModal = document.getElementById('messageModal');

// --- Funções de Navegação e Menu ---

function toggleProfileMenu(event) {
    // Impede que o clique seja propagado para o window.onclick (que fecharia o menu imediatamente)
    event.stopPropagation(); 
    if(profileMenu) {
        profileMenu.classList.toggle('hidden');
    }
}

// Fecha o menu de perfil se o usuário clicar fora dele
function handleGlobalClick(event) {
    const profileContainer = document.getElementById('profile-container');
    if (profileContainer && !profileContainer.contains(event.target)) {
        if(profileMenu) {
            profileMenu.classList.add('hidden');
        }
    }
}

// Expõe funções ao escopo global para o HTML
window.toggleProfileMenu = toggleProfileMenu;
window.handleGlobalClick = handleGlobalClick;

// --- Funções de Modal ---
function showModal(title, message) {
    if (messageModal) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').innerHTML = message;
        messageModal.classList.remove('hidden');
        messageModal.classList.add('flex');
    }
}

function closeModal() {
    if (messageModal) {
        document.getElementById('modalMessage').innerHTML = '';
        messageModal.classList.remove('flex');
        messageModal.classList.add('hidden');
    }
}

window.closeModal = closeModal;

// --- Funções de Perfil (LocalStorage) ---

const defaultProfile = {
    name: "Visitante",
    avatarUrl: "https://placehold.co/32x32/f0f9ff/1d4ed8?text=V"
};

function getProfileFromLocalStorage() {
    try {
        const profileJson = localStorage.getItem('nutriDiaryProfile');
        const profile = profileJson ? JSON.parse(profileJson) : defaultProfile;
        return profile;
    } catch (e) {
        console.error("Erro ao ler perfil do localStorage:", e);
        return defaultProfile;
    }
}

function saveProfile(profile) {
    try {
        localStorage.setItem('nutriDiaryProfile', JSON.stringify(profile));
        renderProfile();
    } catch (e) {
        console.error("Erro ao salvar perfil no localStorage:", e);
    }
}

function renderProfile() {
    const profile = getProfileFromLocalStorage();
    const profileNameDisplay = document.getElementById('profileNameDisplay');
    const profileAvatar = document.getElementById('profileAvatar');

    if (profileNameDisplay) profileNameDisplay.textContent = profile.name;
    
    if (profileAvatar) {
        profileAvatar.src = profile.avatarUrl;
        // Adiciona fallback caso a imagem falhe ao carregar
        profileAvatar.onerror = function() {
            this.src = defaultProfile.avatarUrl;
        };
    }
}

function changeProfileName() {
    closeModal();
    const profile = getProfileFromLocalStorage();
    // Usamos o prompt aqui, pois é uma funcionalidade simples de perfil
    const newName = prompt("Insira seu novo nome de exibição:", profile.name); 
    if (newName !== null && newName.trim() !== "") {
        profile.name = newName.trim();
        saveProfile(profile);
    } else if (newName !== null) {
        showModal("Atenção", "O nome não pode ser vazio.");
    }
}

function changeAvatarUrl() {
    closeModal();
    const profile = getProfileFromLocalStorage();
    const newUrl = prompt("Insira a URL da sua nova foto de perfil:", profile.avatarUrl);
    
    if (newUrl !== null && newUrl.trim() !== "") {
        const url = newUrl.trim();
        // Validação básica de URL (poderia ser mais robusta)
        if (url.startsWith('http://') || url.startsWith('https://')) {
             profile.avatarUrl = url;
             saveProfile(profile);
        } else {
             showModal("Erro", "URL inválida. Por favor, insira um endereço web completo (http:// ou https://).");
        }
    } else if (newUrl !== null) {
        showModal("Atenção", "A URL da imagem não pode ser vazia.");
    }
}

window.changeProfileName = changeProfileName;
window.changeAvatarUrl = changeAvatarUrl;


// --- Funções de Histórico (LocalStorage) ---

function getHistoryFromLocalStorage() {
    try {
        const historyJson = localStorage.getItem('nutriDiaryHistory');
        const history = historyJson ? JSON.parse(historyJson) : [];
        console.log("DEBUG: Histórico lido do localStorage (Total de itens):", history.length); 
        return history;
    } catch (e) {
        console.error("Erro ao ler histórico do localStorage:", e);
        return [];
    }
}

function saveHistoryToLocalStorage(history) {
    try {
        localStorage.setItem('nutriDiaryHistory', JSON.stringify(history));
        console.log("DEBUG: Histórico SALVO no localStorage. Novo total:", history.length);
    } catch (e) {
        console.error("Erro ao salvar histórico no localStorage:", e);
        showModal("Erro de Armazenamento", "Não foi possível salvar o histórico. O armazenamento local pode estar cheio ou desativado.");
    }
}

/**
 * Adiciona a receita calculada ao histórico de consumo (localStorage).
 */
function addRecipeToHistory() {
    if (ingredients.length === 0) {
        showModal("Atenção", "A receita está vazia e não pode ser salva.");
        return;
    }
    
    // Modal customizado para entrada de nome
    const recipeNamePrompt = `
        <p class="mb-3">Insira um nome para a refeição (ex: Almoço, Café da Manhã):</p>
        <input type="text" id="recipeNameInput" placeholder="Nome da Refeição" class="w-full p-2 border border-gray-300 rounded-md mb-4 focus:ring-primary-dark focus:border-primary-dark">
        <div class="flex justify-end space-x-2">
            <button onclick="closeModal()" class="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-300">Cancelar</button>
            <button onclick="confirmSaveRecipe()" class="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-300">Gravar</button>
        </div>
    `;

    showModal("Gravar Consumo", recipeNamePrompt);
}

function confirmSaveRecipe() {
    const recipeNameInput = document.getElementById('recipeNameInput');
    const recipeName = recipeNameInput ? recipeNameInput.value.trim() : null;

    if (!recipeName) {
        // Mostra um erro dentro do modal atual
        const messageDiv = document.getElementById('modalMessage');
        const existingError = messageDiv.querySelector('.text-red-500');
        if (!existingError) {
             messageDiv.insertAdjacentHTML('afterbegin', '<p class="text-red-500 mb-2">O nome da receita não pode ser vazio.</p>');
        }
        return;
    }
    
    closeModal();

    // Lendo dos elementos de resultado da calculadora
    const totalCalories = parseFloat(document.getElementById('totalCalories').textContent);
    const totalProtein = parseFloat(document.getElementById('totalProtein').textContent);
    const totalCarbs = parseFloat(document.getElementById('totalCarbs').textContent);
    
    // Clona os ingredientes para salvar no histórico
    const recipeIngredients = ingredients.map(ing => ({ ...ing }));

    const newEntry = {
        id: Date.now(),
        name: recipeName,
        date: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
        timestamp: Date.now(),
        calories: totalCalories,
        protein_g: totalProtein,
        carbs_g: totalCarbs,
        ingredients: recipeIngredients,
    };

    const currentHistory = getHistoryFromLocalStorage();
    currentHistory.push(newEntry);
    saveHistoryToLocalStorage(currentHistory); // Chama o save com log

    // Redireciona para o histórico após salvar
    window.location.href = "historico.html";
}

window.addRecipeToHistory = addRecipeToHistory;
window.confirmSaveRecipe = confirmSaveRecipe; 

/**
 * Carrega e renderiza o histórico de receitas, agrupando por dia.
 */
function loadHistory() {
    if (!historyListDiv) return; // Só executa se estiver na página historico.html

    const history = getHistoryFromLocalStorage(); // Leitura com log

    historyListDiv.innerHTML = '';
    
    const noHistoryMessage = document.getElementById('noHistoryMessage');
    
    // CORREÇÃO: Verifica se o elemento existe antes de tentar manipular classList
    if (noHistoryMessage) {
        noHistoryMessage.classList.toggle('hidden', history.length > 0);
    }

    if (history.length === 0) {
        return;
    }

    // 1. Agrupa as receitas por dia (YYYY-MM-DD)
    const groupedHistory = history.reduce((acc, entry) => {
        const dateKey = entry.date;
        if (!acc[dateKey]) {
            acc[dateKey] = {
                entries: [],
                totalCalories: 0,
                totalProtein: 0,
                totalCarbs: 0
            };
        }
        acc[dateKey].entries.push(entry);
        acc[dateKey].totalCalories += entry.calories;
        acc[dateKey].totalProtein += entry.protein_g;
        acc[dateKey].totalCarbs += entry.carbs_g;
        return acc;
    }, {});

    // Ordena as chaves de data do mais recente para o mais antigo
    const sortedDates = Object.keys(groupedHistory).sort((a, b) => b.localeCompare(a));
    
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // 2. Renderiza os grupos de data
    sortedDates.forEach(dateKey => {
        const dayData = groupedHistory[dateKey];
        const dateObj = new Date(dateKey + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso horário
        const formattedDate = dateFormatter.format(dateObj).replace(/(\w)/, (c) => c.toUpperCase()); // Capitaliza o dia da semana

        // Contêiner do Dia
        const dayContainer = document.createElement('div');
        dayContainer.className = 'bg-white border border-gray-200 rounded-xl shadow-lg p-5';
        
        // Título e Totais do Dia
        dayContainer.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 mb-3">
                <h3 class="text-xl font-bold text-gray-700">${formattedDate}</h3>
                <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2 sm:mt-0 text-sm font-semibold">
                    <span class="text-red-600">🔥 ${dayData.totalCalories.toFixed(0)} Kcal</span>
                    <span class="text-green-600">💪 ${dayData.totalProtein.toFixed(1)}g Proteína</span>
                    <span class="text-orange-600">🍚 ${dayData.totalCarbs.toFixed(1)}g Carboidratos</span>
                </div>
            </div>
            <div class="space-y-3" id="recipes-${dateKey}">
                <!-- Receitas serão inseridas aqui -->
            </div>
        `;
        
        const recipesDiv = dayContainer.querySelector(`#recipes-${dateKey}`);

        // 3. Renderiza as receitas dentro do dia
        dayData.entries.sort((a, b) => b.timestamp - a.timestamp).forEach(recipe => {
            const recipeItem = document.createElement('div');
            recipeItem.className = 'p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center hover:shadow-sm transition duration-150 flex-wrap gap-2';
            recipeItem.innerHTML = `
                <div class="flex-1 min-w-0">
                    <p class="font-semibold text-gray-800">${recipe.name}</p>
                    <p class="text-sm text-gray-500">${new Date(recipe.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div class="flex items-center space-x-3 text-right">
                    <span class="text-sm font-medium text-red-500">${recipe.calories.toFixed(0)} Kcal</span>
                    <button onclick="showRecipeDetails(${recipe.id})" class="text-primary-dark hover:text-primary-hover transition duration-150 p-1 rounded-full bg-primary-light bg-opacity-10" title="Ver Detalhes">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                    <button onclick="deleteRecipe(${recipe.id})" class="text-red-500 hover:text-red-700 transition duration-150 p-1 rounded-full bg-red-500 bg-opacity-10" title="Excluir">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 10-2 0v6a1 1 0 102 0V8z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
            `;
            recipesDiv.appendChild(recipeItem);
        });
        
        historyListDiv.appendChild(dayContainer);
    });
}
window.loadHistory = loadHistory;

/**
 * Exibe os detalhes de uma receita específica no modal.
 */
function showRecipeDetails(id) {
    const history = getHistoryFromLocalStorage();
    const recipe = history.find(r => r.id === id);

    if (!recipe) {
        showModal("Erro", "Receita não encontrada.");
        return;
    }

    let ingredientsHTML = '<h4 class="font-bold text-gray-800 mb-2">Ingredientes:</h4><ul class="list-disc list-inside space-y-1 text-sm">';
    recipe.ingredients.forEach(ing => {
        ingredientsHTML += `<li>${ing.quantity} ${ing.unit} de <span class="capitalize font-medium">${ing.name}</span></li>`;
    });
    ingredientsHTML += '</ul>';

    const detailsHTML = `
        <div class="mb-4 grid grid-cols-3 gap-3">
            <div class="p-2 bg-red-100 rounded-lg"><p class="text-sm font-semibold text-red-700">Calorias: ${recipe.calories.toFixed(0)} Kcal</p></div>
            <div class="p-2 bg-green-100 rounded-lg"><p class="text-sm font-semibold text-green-700">Proteína: ${recipe.protein_g.toFixed(1)}g</p></div>
            <div class="p-2 bg-orange-100 rounded-lg"><p class="text-sm font-semibold text-orange-700">Carboidratos: ${recipe.carbs_g.toFixed(1)}g</p></div>
        </div>
        ${ingredientsHTML}
    `;

    showModal(`Detalhes: ${recipe.name}`, detailsHTML);
}
window.showRecipeDetails = showRecipeDetails;

/**
 * Exclui uma receita do histórico.
 */
function deleteRecipe(id) {
    // Substituindo o confirm() nativo por um modal customizado
    const deletePrompt = `
        <p class="mb-4">Você realmente deseja excluir este registro de consumo do seu diário?</p>
        <div class="flex justify-end space-x-2">
            <button onclick="closeModal()" class="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-300">Cancelar</button>
            <button onclick="confirmDeleteRecipe(${id})" class="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition duration-300">Excluir</button>
        </div>
    `;
    showModal("Confirmação de Exclusão", deletePrompt);
}

function confirmDeleteRecipe(id) {
    closeModal();
    let history = getHistoryFromLocalStorage();
    const updatedHistory = history.filter(r => r.id !== id);
    
    saveHistoryToLocalStorage(updatedHistory);
    loadHistory(); // Recarrega a lista
}

window.deleteRecipe = deleteRecipe;
window.confirmDeleteRecipe = confirmDeleteRecipe;


// --- Gerenciamento de Ingredientes na Calculadora (calculadora.html) ---

function updateIngredientCount() {
    // Verifica se os elementos da calculadora existem
    if (!document.getElementById('ingredientCount')) return; 
    document.getElementById('ingredientCount').textContent = ingredients.length;
    
    // CORREÇÃO: Verifica se o elemento noIngredientsMessage existe antes de usar.
    if (noIngredientsMessage) {
        noIngredientsMessage.classList.toggle('hidden', ingredients.length > 0);
    }
}

function renderIngredientList() {
    if (!ingredientListDiv) return;

    ingredientListDiv.innerHTML = '';
    ingredients.forEach((ing, index) => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 shadow-sm';
        item.innerHTML = `
            <div class="flex-grow">
                <p class="font-semibold text-gray-800 capitalize">${ing.name}</p>
                <p class="text-sm text-gray-500">${ing.quantity} ${ing.unit}</p>
            </div>
            <button onclick="removeIngredient(${index})" class="text-red-500 hover:text-red-700 p-1 rounded-full transition duration-150" title="Remover">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 10-2 0v6a1 1 0 102 0V8z" clip-rule="evenodd" />
                </svg>
            </button>
        `;
        ingredientListDiv.appendChild(item);
    });
    updateIngredientCount();
}

function addIngredient() {
    if (!ingredientNameInput) return; // Só executa na calculadora

    const name = ingredientNameInput.value.trim().toLowerCase();
    const quantity = parseFloat(quantityInput.value);
    const unit = unitSelect.value;

    if (!name || isNaN(quantity) || quantity <= 0) {
        showModal("Erro de Entrada", "Por favor, insira um nome de ingrediente válido e uma quantidade positiva.");
        return;
    }

    ingredients.push({ name, quantity, unit });
    renderIngredientList();

    // Limpa apenas os campos de entrada do ingrediente
    ingredientNameInput.value = '';
    quantityInput.value = '100';
    unitSelect.value = 'gramas';
}

function removeIngredient(index) {
    ingredients.splice(index, 1);
    renderIngredientList();
    // Esconde resultados se a lista ficar vazia
    if (ingredients.length === 0) {
        if(resultsSection) resultsSection.classList.add('hidden');
        resetNutritionalDisplay();
    }
}
window.removeIngredient = removeIngredient;
window.addIngredient = addIngredient;


// --- Lógica da API Gemini para Cálculo Nutricional ---

/**
 * Reseta a exibição dos resultados nutricionais.
 */
function resetNutritionalDisplay() {
    if (!document.getElementById('totalCalories')) return; // Só executa na calculadora
    document.getElementById('totalCalories').textContent = '0';
    document.getElementById('totalProtein').textContent = '0.0';
    document.getElementById('totalCarbs').textContent = '0.0';
    document.getElementById('citation').textContent = '';
}

/**
 * Realiza a chamada à API Gemini com Google Search para obter dados nutricionais.
 * Implementa Retry com Exponential Backoff.
 */
async function fetchNutrientsWithRetry(ingredient) {
    const maxRetries = 3;
    let lastError = null;
    
    if (apiKey === "" || apiKey === "SUA_CHAVE_API_VAI_AQUI") {
        throw new Error("Chave API ausente. Por favor, insira sua chave na variável 'apiKey' no script.js.");
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const userQuery = `Usando dados de pesquisa, forneça as calorias totais (Kcal), a proteína em gramas (protein_g) e os carboidratos em gramas (carbs_g) contidos em ${ingredient.quantity} ${ingredient.unit} de ${ingredient.name} cru ou cozido (o mais apropriado). Responda APENAS com um objeto JSON, sem texto explicativo ou markdown. O JSON deve ter exatamente esta estrutura: {"calories": [valor], "protein_g": [valor], "carbs_g": [valor]}.`;

            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                tools: [{ "google_search": {} }],
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                let errorDetail = "";
                try {
                    const errorBody = await response.text();
                    console.error("API Error Response Body:", errorBody);
                    errorDetail = `\nDetalhe (Console): Verifique o console para mais detalhes (código ${response.status}).`; 
                } catch (e) {
                    errorDetail = "\nDetalhe: Não foi possível ler o corpo da resposta de erro.";
                }
                
                throw new Error(`A resposta da API falhou com status: ${response.status}${errorDetail}`);
            }

            const result = await response.json();
            
            const textPart = result.candidates?.[0]?.content?.parts?.[0]?.text;
            const groundingMetadata = result.candidates?.[0]?.groundingMetadata;

            if (!textPart) {
                throw new Error("Resposta da API vazia ou mal formatada.");
            }

            // Tenta extrair e parsear o JSON
            let jsonString = textPart.trim();
            // Remove blocos de código Markdown se existirem (```json...```)
            if (jsonString.startsWith('```')) {
                const match = jsonString.match(/```json\n([\s\S]*?)\n```/);
                jsonString = match && match[1] ? match[1].trim() : jsonString.replace(/```json|```/g, '').trim();
            }

            const jsonResponse = JSON.parse(jsonString);

            if (isNaN(jsonResponse.calories) || isNaN(jsonResponse.protein_g) || isNaN(jsonResponse.carbs_g)) {
                 throw new Error("JSON retornado não contém todos os campos numéricos necessários.");
            }

            let sources = [];
            if (groundingMetadata && groundingMetadata.groundingAttributions) {
                sources = groundingMetadata.groundingAttributions
                    .map(attr => ({
                        uri: attr.web?.uri,
                        title: attr.web?.title,
                    }))
                    .filter(source => source.uri && source.title);
            }

            return { 
                ...jsonResponse,
                sources,
                calories: parseFloat(jsonResponse.calories),
                protein_g: parseFloat(jsonResponse.protein_g),
                carbs_g: parseFloat(jsonResponse.carbs_g)
            };

        } catch (error) {
            lastError = error;
            console.error(`Tentativa ${attempt + 1} falhou para ${ingredient.name}:`, error);
            if (attempt < maxRetries - 1) {
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw new Error(`Falha ao obter dados nutricionais após ${maxRetries} tentativas. Último erro: ${lastError.message}`);
}

// --- Lógica de Cálculo Total ---

async function calculateTotal() {
    if (ingredients.length === 0) {
        showModal("Atenção", "Por favor, adicione pelo menos um ingrediente para calcular a nutrição.");
        return;
    }
    
    if (apiKey === "" || apiKey === "SUA_CHAVE_API_VAI_AQUI") {
        showModal("Erro de Configuração", "A chave API não foi inserida no arquivo 'script.js'. Por favor, substitua 'SUA_CHAVE_API_VAI_AQUI' pela sua chave real para testes locais.");
        return;
    }


    if (!calculateButton) return;

    calculateButton.disabled = true;
    const originalButtonContent = calculateButton.innerHTML;
    calculateButton.innerHTML = `<span class="loading-ring mr-2"></span> Calculando Ingredientes...`;
    resultsSection.classList.add('hidden');
    resetNutritionalDisplay(); 

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let allSources = new Map();

    for (const ingredient of ingredients) {
        try {
            const result = await fetchNutrientsWithRetry(ingredient);
            
            totalCalories += result.calories;
            totalProtein += result.protein_g;
            totalCarbs += result.carbs_g;

            result.sources.forEach(source => {
                if (source.uri && source.title) {
                    allSources.set(source.uri, source.title);
                }
            });

        } catch (error) {
            const errorMessage = error.message.includes('A resposta da API falhou com status: 400') && !error.message.includes('Detalhe')
                ? `Erro no formato da resposta. Verifique se o ingrediente possui dados nutricionais disponíveis na web.`
                : error.message;

            showModal("Erro de Cálculo", `Não foi possível obter dados para: ${ingredient.name}. Por favor, verifique a grafia ou tente novamente mais tarde. (${errorMessage})`);
            calculateButton.innerHTML = originalButtonContent;
            calculateButton.disabled = false;
            return;
        }
    }

    // Exibe resultados
    document.getElementById('totalCalories').textContent = totalCalories.toFixed(0);
    document.getElementById('totalProtein').textContent = totalProtein.toFixed(1);
    document.getElementById('totalCarbs').textContent = totalCarbs.toFixed(1);
    
    // Exibe as fontes
    const citationDiv = document.getElementById('citation');
    if (allSources.size > 0) {
        let citationHTML = 'Fontes de Informação: ';
        let sourceArray = Array.from(allSources.entries());
        citationHTML += sourceArray.map(([uri, title]) => `<a href="${uri}" target="_blank" class="text-primary-light hover:underline">${title}</a>`).join(' | ');
        citationDiv.innerHTML = citationHTML;
    } else {
        citationDiv.textContent = 'As informações nutricionais foram geradas a partir de dados da web.';
    }

    resultsSection.classList.remove('hidden');
    calculateButton.innerHTML = originalButtonContent;
    calculateButton.disabled = false;
}

window.calculateTotal = calculateTotal;


function resetApp() {
    ingredients = [];
    renderIngredientList();
    if(resultsSection) resultsSection.classList.add('hidden');
    resetNutritionalDisplay();
}

window.resetApp = resetApp;

// --- Gerenciamento de Ingredientes na Calculadora (calculadora.html) ---

function addIngredient() {
    if (!ingredientNameInput) return; // Só executa na calculadora

    const name = ingredientNameInput.value.trim().toLowerCase();
    const quantity = parseFloat(quantityInput.value);
    const unit = unitSelect.value;

    if (!name || isNaN(quantity) || quantity <= 0) {
        showModal("Erro de Entrada", "Por favor, insira um nome de ingrediente válido e uma quantidade positiva.");
        return;
    }

    ingredients.push({ name, quantity, unit });
    renderIngredientList();

    // Limpa apenas os campos de entrada do ingrediente
    ingredientNameInput.value = '';
    quantityInput.value = '100';
    unitSelect.value = 'gramas';
}

function removeIngredient(index) {
    ingredients.splice(index, 1);
    renderIngredientList();
    // Esconde resultados se a lista ficar vazia
    if (ingredients.length === 0) {
        if(resultsSection) resultsSection.classList.add('hidden');
        resetNutritionalDisplay();
    }
}
window.removeIngredient = removeIngredient;
window.addIngredient = addIngredient;


// --- Inicialização ---

document.addEventListener('DOMContentLoaded', () => {
    // Adiciona o listener para fechar o modal com a tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
});