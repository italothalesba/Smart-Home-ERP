import { GoogleGenAI, Type } from "@google/genai";

const getGeminiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("GEMINI_API_KEY is not defined. AI features will be disabled.");
  }
  return key || 'MISSING_KEY';
};

const ai = new GoogleGenAI({ apiKey: getGeminiKey() });

// Helper for exponential backoff retries
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Only retry on rate limit (429) or transient errors
      const isRateLimit = error?.message?.includes("429") || error?.status === 429;
      const isTransient = error?.message?.includes("500") || error?.message?.includes("503");
      
      if ((isRateLimit || isTransient) && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`Gemini busy (429), retrying in ${delay.toFixed(0)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export interface ReceiptItem {
  nome: string;
  preco: number;
  metadata?: string;
}

export async function testGeminiConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const key = getGeminiKey();
    if (key === 'MISSING_KEY') {
      return { success: false, message: "API Key ausente nas variáveis de ambiente." };
    }

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "ping",
    }));

    if (response.text) {
      return { success: true, message: "Conexão com Gemini estabelecida com sucesso (Free Tier)." };
    }
    return { success: false, message: "Resposta vazia do Gemini." };
  } catch (error: any) {
    const isRateLimit = error?.message?.includes("429");
    const msg = isRateLimit 
      ? "Gemini está com alta demanda no momento (Limite atingido). Tente novamente em alguns segundos."
      : error.message || "Erro desconhecido na API do Gemini.";
    
    console.error("Gemini Test Failure:", error);
    return { success: false, message: msg };
  }
}

export async function processMarketReceipt(base64Image: string): Promise<ReceiptItem[]> {
  try {
    const prompt = `Aja como um Extrator de Dados de Alta Precisão (Swiss Style).
Analise este documento (cupom fiscal, print de extrato bancário ou recibo).

LEI IMUTÁVEL:
1. PRECISÃO ABSOLUTA: Se um dado não estiver 100% legível, retorne "Desconhecido". NUNCA INVENTE NOMES (Hallucinations forbidden).
2. LOGOTIPOS: Priorize nomes claros de marcas (Carrefour, Nubank, Itaú, etc).
3. EXTRATOS BANCÁRIOS: Se o documento for um extrato, identifique a ÚLTIMA transação relevante ou o resumo do período (Entradas/Saídas).
4. DETALHAMENTO: É OBRIGATÓRIO extrair a lista de itens (nome e preço) se for um cupom fiscal.
5. QR CODES: Se houver um link de QR Code visível ou processado, trate os parâmetros (como vNF para valor total) como FONTE DE VERDADE.

Retorne APENAS o JSON conforme o schema. O metadata deve conter observações como 'Banco', 'Data' ou 'Total NF'.`;

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { text: prompt },
        { 
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nome: { type: Type.STRING, description: "Nome limpo ou Desconhecido" },
              preco: { type: Type.NUMBER, description: "Valor extraído" },
              metadata: { type: Type.STRING, description: "Informação adicional de contexto" }
            },
            required: ["nome", "preco"],
          },
        },
      }
    }));

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Vision Error:", error);
    return [];
  }
}

export async function processQrUrl(url: string): Promise<ReceiptItem[]> {
  try {
    const prompt = `Analise the following Cupom Fiscal link (Sefaz/NF): ${url}
Extract total value and main items if possible through URL parameters (e.g. vNF).
If no item details, return only the total with name 'Total Nota Fiscal'.

Return ONLY a JSON: [{nome: string, preco: number}]`;

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    }));

    const text = response.text;
    if (!text) return [];
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("QR URL parsing error:", error);
    return [];
  }
}

export async function generateShoppingList(meals: string[], personCount: number = 2): Promise<string[]> {
  try {
    const prompt = `Identity: Nutritionist and House Organizer.
Task: Generate a technical shopping list for the following dishes: ${meals.join(', ')}. 
Audience is Brazilian. Consider ${personCount} people consuming.
Return clean and concise product/ingredient names.
Respond ONLY with a JSON on the 'itens' key: { "itens": string[] }`;

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    }));

    const text = response.text;
    if (!text) return [];
    const parsed = JSON.parse(text);
    return parsed.itens || [];
  } catch (error) {
    console.error("AI Shopping List Error:", error);
    return [];
  }
}
