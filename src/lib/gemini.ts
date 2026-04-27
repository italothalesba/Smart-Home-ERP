import { GoogleGenAI, Type } from "@google/genai";

const getGeminiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("GEMINI_API_KEY is not defined. AI features will be disabled.");
  }
  return key || 'MISSING_KEY';
};

const ai = new GoogleGenAI({ apiKey: getGeminiKey() });

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

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "ping",
    });

    if (response.text) {
      return { success: true, message: "Conexão com Gemini estabelecida com sucesso (Free Tier)." };
    }
    return { success: false, message: "Resposta vazia do Gemini." };
  } catch (error: any) {
    console.error("Gemini Test Error:", error);
    return { success: false, message: error.message || "Erro desconhecido na API do Gemini." };
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

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
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
    });

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

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

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

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) return [];
    const parsed = JSON.parse(text);
    return parsed.itens || [];
  } catch (error) {
    console.error("AI Shopping List Error:", error);
    return [];
  }
}
