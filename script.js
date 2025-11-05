// Variáveis de ambiente
// ATENÇÃO: Se estiver executando este código localmente (fora do Canvas),
// você DEVE inserir sua chave API da Google no lugar das aspas vazias ("").
// Para o Canvas funcionar, ela deve ser uma string vazia.
const apiKey = ""; // <--- Sua chave API deve ir aqui!
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

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
 * Realiza a chamada à API Gemini com Google Search para obter dados nutricionais.
 * Implementa Retry com Exponential Backoff.
 */
async function fetchNutrientsWithRetry(ingredient) {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Novo prompt sem a configuração de responseMimeType
            const userQuery = `Usando dados de pesquisa, forneça as calorias totais (Kcal), a proteína em gramas (protein_g) e os carboidratos em gramas (carbs_g) contidos em ${ingredient.quantity} ${ingredient.unit} de ${ingredient.name} cru ou cozido (o mais apropriado). Responda APENAS com um objeto JSON, sem texto explicativo ou markdown. O JSON deve ter exatamente esta estrutura: {"calories": [valor], "protein_g": [valor], "carbs_g": [valor]}.`;

            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                tools: [{ "google_search": {} }], // Habilita pesquisa para dados nutricionais
                // O bloco generationConfig com responseMimeType foi removido para resolver o erro 400
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // Tenta ler o corpo da resposta de erro para obter detalhes da API
                let errorDetail = "";
                try {
                    const errorBody = await response.text();
                    console.error("API Error Response Body:", errorBody);
                    // Adiciona um trecho da mensagem de erro no modal para diagnóstico
                    errorDetail = `\nDetalhe (Console): Verifique o console para mais detalhes (código ${response.status}).`; 
                } catch (e) {
                    errorDetail = "\nDetalhe: Não foi possível ler o corpo da resposta de erro.";
                }
                
                throw new Error(`A resposta da API falhou com status: ${response.status}${errorDetail}`);
            }

            const result = await response.json();
            
            // O modelo agora retorna o JSON como uma string de texto, que precisamos analisar
            const textPart = result.candidates?.[0]?.content?.parts?.[0]?.text;
            const groundingMetadata = result.candidates?.[0]?.groundingMetadata;

            if (!textPart) {
                throw new Error("Resposta da API vazia ou mal formatada.");
            }

            // O modelo pode envolver o JSON com ```json...``` ou apenas retornar o JSON bruto.
            // Tentamos extrair o JSON se estiver envolto em markdown.
            let jsonString = textPart.trim();
            if (jsonString.startsWith('```')) {
                const match = jsonString.match(/```json\n([\s\S]*?)\n```/);
                if (match && match[1]) {
                    jsonString = match[1].trim();
                } else {
                    // Tenta extrair apenas o JSON bruto se for malformado (ex: ```\n{...}```)
                    jsonString = jsonString.replace(/```json|```/g, '').trim();
                }
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
                sources
            };

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
            // Verifica se o erro é o 400 específico, senão, exibe a mensagem de erro geral
            const errorMessage = error.message.includes('A resposta da API falhou com status: 400') && !error.message.includes('Detalhe')
                ? `Erro no formato da resposta. Verifique se o ingrediente possui dados nutricionais disponíveis na web.`
                : error.message;

            showModal("Erro de Cálculo", `Não foi possível obter dados para: ${ingredient.name}. Por favor, verifique a grafia ou tente novamente mais tarde. (${errorMessage})`);
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