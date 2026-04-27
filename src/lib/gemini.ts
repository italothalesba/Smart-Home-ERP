import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const getGeminiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("GEMINI_API_KEY is not defined. AI features will be disabled.");
  }
  return key || 'MISSING_KEY';
};

const genAI = new GoogleGenerativeAI(getGeminiKey());

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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("ping");
    const response = await result.response;

    if (response.text()) {
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
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              nome: { type: SchemaType.STRING, description: "Nome limpo ou Desconhecido" },
              preco: { type: SchemaType.NUMBER, description: "Valor extraído" },
              metadata: { type: SchemaType.STRING, description: "Informação adicional de contexto" }
            },
            required: ["nome", "preco"],
          },
        },
      },
    });

    const prompt = `Aja como um Extrator de Dados de Alta Precisão (Swiss Style).
Analise este documento (cupom fiscal, print de extrato bancário ou recibo).

LEI IMUTÁVEL:
1. PRECISÃO ABSOLUTA: Se um dado não estiver 100% legível, retorne "Desconhecido". NUNCA INVENTE NOMES (Hallucinations forbidden).
2. LOGOTIPOS: Priorize nomes claros de marcas (Carrefour, Nubank, Itaú, etc).
3. EXTRATOS BANCÁRIOS: Se o documento for um extrato, identifique a ÚLTIMA transação relevante ou o resumo do período (Entradas/Saídas).
4. DETALHAMENTO: É OBRIGATÓRIO extrair a lista de itens (nome e preço) se for um cupom fiscal.
5. QR CODES: Se houver um link de QR Code visível ou processado, trate os parâmetros (como vNF para valor total) como FONTE DE VERDADE.

Retorne APENAS o JSON conforme o schema. O metadata deve conter observações como 'Banco', 'Data' ou 'Total NF'.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Vision Error:", error);
    return [];
  }
}

export async function processQrUrl(url: string): Promise<ReceiptItem[]> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `Analise o seguinte link de Cupom Fiscal (Sefaz/NF): ${url}
Extraia o valor total e os itens principais se possível através dos parâmetros da URL (ex: vNF).
Se não houver detalhes de itens, retorne apenas o total com o nome 'Total Nota Fiscal'.

Retorne APENAS um JSON: [{nome: string, preco: number}]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
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
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `Identidade: Nutricionista e Organizador Doméstico.
Tarefa: Gere uma lista de compras técnica para os seguintes pratos: ${meals.join(', ')}. 
O público é brasileiro. Considere que há ${personCount} pessoas consumindo.
Retorne nomes de produtos/ingredientes limpos e concisos.
Responda APENAS com um JSON na chave 'itens': { "itens": string[] }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    if (!text) return [];
    const parsed = JSON.parse(text);
    return parsed.itens || [];
  } catch (error) {
    console.error("AI Shopping List Error:", error);
    return [];
  }
}
