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
}

export async function testGeminiConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const key = getGeminiKey();
    if (key === 'MISSING_KEY') {
      return { success: false, message: "API Key ausente nas variáveis de ambiente." };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ text: "ping" }],
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
          text: `Aja como um Extrator de Dados de Alta Precisão (Swiss Style).
Analise este documento (cupom fiscal, print de extrato bancário ou recibo).

LEI IMUTÁVEL:
1. PRECISÃO ABSOLUTA: Se um dado não estiver 100% legível, retorne "Desconhecido". NUNCA INVENTE NOMES (Hallucination is strictly forbidden).
2. LOGOTIPOS: Priorize nomes claros de marcas (Carrefour, Nubank, Itaú, etc).
3. EXTRATOS BANCÁRIOS: Se o documento for um extrato, identifique a ÚLTIMA transação relevante ou o resumo do período (Entradas/Saídas).
4. DETALHAMENTO: É OBRIGATÓRIO extrair a lista de itens (nome e preço) se for um cupom fiscal.
5. QR CODES: Se houver um link de QR Code visível ou processado, trate os parâmetros (como vNF para valor total) como FONTE DE VERDADE.

Retorne APENAS um JSON: [{nome: string, preco: number, metadata?: string}]
O metadata deve conter observações como 'Banco', 'Data' ou 'Total NF'.`,
        },
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
      },
    });

    if (!response.text) return [];
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Vision Error:", error);
    return [];
  }
}

export async function processQrUrl(url: string): Promise<ReceiptItem[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          text: `Analise o seguinte link de Cupom Fiscal (Sefaz/NF): ${url}
Extraia o valor total e os itens principais se possível através dos parâmetros da URL (ex: vNF).
Se não houver detalhes de itens, retorne apenas o total com o nome 'Total Nota Fiscal'.

Retorne APENAS um JSON: [{nome: string, preco: number}]`,
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) return [];
    const parsed = JSON.parse(response.text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("QR URL parsing error:", error);
    return [];
  }
}

export async function generateShoppingList(meals: string[], personCount: number = 2): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
