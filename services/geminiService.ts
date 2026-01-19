import { GoogleGenerativeAI } from "@google/generative-ai";

// Tenta obter a chave via variáveis de ambiente do Vite (import.meta.env) ou deixa vazio
const apiKey = (import.meta as any).env?.VITE_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export const generateAIResponse = async (prompt: string, context: string): Promise<string> => {
  if (!apiKey) {
    return "Configuração de API Key pendente. Por favor, configure a chave da API Gemini.";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const finalPrompt = `Contexto do Sistema: Você é a "Hi AI", uma assistente virtual inteligente integrada ao sistema "Hi Control", um ERP para contadores.
      O usuário está pedindo ajuda com o seguinte contexto: ${context}
      
      Pergunta do Usuário: ${prompt}
      
      Responda de forma concisa, profissional e útil para um contador.`;

    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    return "Desculpe, ocorreu um erro ao conectar com a inteligência artificial.";
  }
};