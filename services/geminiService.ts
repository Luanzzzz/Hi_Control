import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateAIResponse = async (prompt: string, context: string): Promise<string> => {
  if (!apiKey) {
    return "Configuração de API Key pendente. Por favor, configure a chave da API Gemini.";
  }

  try {
    const model = 'gemini-3-flash-preview';
    const response = await ai.models.generateContent({
      model: model,
      contents: `Contexto do Sistema: Você é a "Hi AI", uma assistente virtual inteligente integrada ao sistema "Hi Control", um ERP para contadores.
      O usuário está pedindo ajuda com o seguinte contexto: ${context}
      
      Pergunta do Usuário: ${prompt}
      
      Responda de forma concisa, profissional e útil para um contador.`,
    });

    return response.text || "Não consegui processar sua solicitação no momento.";
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    return "Desculpe, ocorreu um erro ao conectar com a inteligência artificial.";
  }
};