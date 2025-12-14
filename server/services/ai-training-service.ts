import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const aiTrainingService = {
  async performCompleteAnalysis(limit: number) {
    // In a real scenario, this would fetch historical response data from the database
    // and use Gemini to cluster and analyze the response patterns.
    // For now, we return a simulated structured analysis.

    return {
      responseTypes: [
        { name: "Professional & Concise", description: "Formal tone, direct address of issues", frequency: "45%" },
        { name: "Warm & Welcoming", description: "Friendly tone, gratitude focused", frequency: "30%" },
        { name: "Apologetic & Solution-Oriented", description: "Empathetic tone for negative reviews", frequency: "25%" }
      ],
      testExamples: {
        "Professional & Concise": [
          "Thank you for your feedback. We appreciate your visit.",
          "We value your input and hope to serve you better next time."
        ],
        "Warm & Welcoming": [
          "Thanks so much for stopping by! We're thrilled you enjoyed it.",
          "It was a pleasure having you! Can't wait to see you again."
        ],
        "Apologetic & Solution-Oriented": [
          "We are truly sorry that your experience did not meet expectations.",
          "Please accept our apologies. We would like to make this right."
        ]
      },
      totalAnalyzed: limit,
      analysisDate: new Date().toISOString()
    };
  },

  async generateTestExamples(patterns: any[]) {
      const results: Record<string, string[]> = {};
      
      for(const pattern of patterns) {
        try {
             const prompt = `Generate ${pattern.examples ? 5 : 3} examples of a '${pattern.type}' response to a customer review. 
             Characteristics: ${pattern.characteristics?.join(', ') || pattern.description}.
             Context: ${pattern.description}.
             Return strictly a JSON array of strings.`;

             const result = await ai.models.generateContent({
                 model: 'gemini-2.5-flash',
                 contents: prompt,
                 config: {
                     responseMimeType: 'application/json',
                     responseSchema: {
                         type: Type.ARRAY,
                         items: { type: Type.STRING }
                     }
                 }
             });
             
             results[pattern.type] = JSON.parse(result.text || "[]");
        } catch (e) {
            console.error(`Error generating examples for ${pattern.type}:`, e);
            results[pattern.type] = ["Example generation failed. Please try again."];
        }
      }
      
      return results;
  },

  async analyzeHistoricalResponses(limit: number) {
      // Mock quick analysis of historical data
       return [
        { name: "Standard Reply", count: Math.floor(limit * 0.6), sentiment: "Neutral" },
        { name: "Detailed Feedback", count: Math.floor(limit * 0.4), sentiment: "Positive" }
      ];
  }
};
