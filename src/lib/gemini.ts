import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface ReceiptItem {
  nome: string;
  preco: number;
}

export async function processMarketReceipt(base64Image: string): Promise<ReceiptItem[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
        {
          text: `Aja como um Extrator de Dados de Alta Precisão.
Analise este documento (cupom fiscal, print de extrato ou recibo).

REGRAS OBRIGATÓRIAS:
1. PRECISÃO ABSOLUTA: Se um dado não estiver 100% legível, retorne "Desconhecido". NUNCA INVENTE NOMES.
2. LOGOTIPOS: Se houver logotipos ou nomes de estabelecimentos claros (ex: Carrefour, Nubank, Pão de Açúcar), use-os.
3. EXTRATOS: Se for um extrato bancário, extraia a última transação relevante ou o resumo.
4. DETALHAMENTO: Extraia a lista completa de itens (nome e preço) se for um cupom fiscal.
5. FALLBACK: Se não for um cupom ou extrato, tente extrair informações financeiras relevantes.

Retorne APENAS um JSON: [{nome: string, preco: number}]`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nome: { type: Type.STRING, description: "Nome limpo do produto" },
              preco: { type: Type.NUMBER, description: "Preço unitário ou total do item" },
            },
            required: ["nome", "preco"],
          },
        },
      },
    });

    if (!response.text) return [];
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Vision Error:", error);
    return [];
  }
}

export async function generateShoppingList(meals: string[], personCount: number = 2): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          text: `Identidade: Nutricionista e Organizador Doméstico.
Tarefa: Gere uma lista de compras técnica para os seguintes pratos: ${meals.join(', ')}. 
O público é brasileiro. Considere que há ${personCount} pessoas consumindo.
Retorne nomes de produtos/ingredientes limpos e concisos.
Responda APENAS com um JSON na chave 'itens': { "itens": string[] }`,
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) return [];
    const parsed = JSON.parse(response.text);
    return parsed.itens || [];
  } catch (error) {
    console.error("AI Shopping List Error:", error);
    return [];
  }
}
