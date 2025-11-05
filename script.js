// Variáveis de ambiente
// A chave API foi removida e será gerenciada pelo servidor proxy.
const PROXY_URL = "/api/calculate"; // Novo endpoint do servidor proxy.

let ingredients = [];

// Funções de UI
const ingredientNameInput = document.getElementById('ingredientName');
const quantityInput = document.getElementById('quantity');
const unitSelect = document.getElementById('unit');
const ingredientListDiv = document.getElementById('ingredientList');
const calculateButton = document.getElementById('calculateButton');
const resultsSection = document.getElementById('resultsSection');
const noIngredientsMessage = document.getElementById('noIngredientsMessage');

// --- Funções de Modal ---
function showModal(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('messageModal').classList.remove('hidden');
    document.getElementById('messageModal').classList.add('flex');
}

function closeModal() {
    document.getElementById('modalMessage').innerHTML = ''; // Limpa a mensagem
    document.getElementById('messageModal').classList.remove('flex');
    document.getElementById('messageModal').classList.add('hidden');
}

// --- Gerenciamento de Ingredientes ---

function updateIngredientCount() {
    document.getElementById('ingredientCount').textContent = ingredients.length;
    noIngredientsMessage.classList.toggle('hidden', ingredients.length > 0);
}

function renderIngredientList() {
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
        resultsSection.classList.add('hidden');
    }
}

// Expõe funções ao escopo global para que o HTML possa chamá-las (usando `onclick`)
window.addIngredient = addIngredient;
window.removeIngredient = removeIngredient;
window.calculateTotal = calculateTotal;
window.resetApp = resetApp;
window.closeModal = closeModal;


// --- Lógica da API Gemini para Cálculo Nutricional ---

/**
 * Realiza a chamada ao endpoint de proxy do servidor para obter dados nutricionais.
 * Implementa Retry com Exponential Backoff.
 */
async function fetchNutrientsWithRetry(ingredient) {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Chamada para o nosso servidor proxy seguro, que fará a chamada real à API Gemini.
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Enviamos APENAS o ingrediente para o servidor
                body: JSON.stringify({ ingredient: ingredient }) 
            });

            if (!response.ok) {
                // Se o proxy retornar um erro (ex: 500, 404), ele contém a mensagem de erro.
                let errorBody = "";
                try {
                    errorBody = await response.text();
                } catch (e) {
                    errorBody = `Erro HTTP: ${response.status}`;
                }
                console.error("Proxy Error Response:", errorBody);
                throw new Error(`O servidor proxy retornou um erro: ${response.status}. Detalhe: ${errorBody.substring(0, 100)}...`);
            }

            // O proxy deve retornar um objeto JSON pronto
            const result = await response.json();
            
            // Verifica se o JSON retornado pelo PROXY é válido e tem a estrutura esperada
            if (isNaN(result.calories) || isNaN(result.protein_g) || isNaN(result.carbs_g)) {
                 throw new Error("Resposta do proxy mal formada ou incompleta.");
            }

            return result; // Retorna o JSON processado (inclui 'sources')

        } catch (error) {
            lastError = error;
            console.error(`Tentativa ${attempt + 1} falhou para ${ingredient.name}:`, error);
            if (attempt < maxRetries - 1) {
                // Espera exponencial: 1s, 2s, 4s
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

    calculateButton.disabled = true;
    const originalButtonContent = calculateButton.innerHTML;
    calculateButton.innerHTML = `<span class="loading-ring mr-2"></span> Calculando Ingredientes...`;
    resultsSection.classList.add('hidden');

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

            // Acumula fontes
            result.sources.forEach(source => {
                if (source.uri && source.title) {
                    allSources.set(source.uri, source.title);
                }
            });

        } catch (error) {
            // Exibe a mensagem de erro retornada pelo servidor proxy ou pela falha de rede/parse
            showModal("Erro de Cálculo", `Não foi possível obter dados para: ${ingredient.name}. Por favor, verifique a grafia ou tente novamente mais tarde. (${error.message})`);
            calculateButton.innerHTML = originalButtonContent;
            calculateButton.disabled = false;
            return; // Interrompe se houver falha crítica
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

function resetApp() {
    ingredients = [];
    renderIngredientList();
    resultsSection.classList.add('hidden');
    document.getElementById('totalCalories').textContent = '0';
    document.getElementById('totalProtein').textContent = '0.0';
    document.getElementById('totalCarbs').textContent = '0.0';
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    renderIngredientList();
});