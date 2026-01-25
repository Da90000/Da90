/**
 * Orchestrator: Calls the secure server-side AI API endpoint.
 */
export async function processUserQuery(query: string, userId: string): Promise<string> {
    try {
        console.log('Sending query to Server AI API:', { intent: "Proxy", userId });

        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, userId }),
        });

        if (!response.ok) {
            let errorDetail;
            try {
                errorDetail = await response.json();
            } catch (e) {
                errorDetail = await response.text().catch(() => "Unknown error");
            }
            console.error(`AI API Error (${response.status}):`, errorDetail);
            return "I encountered an error connecting to my brain. Please try again later.";
        }

        const data = await response.json();
        return data.response || "No response received.";

    } catch (error) {
        console.error("AI Service Proxy Error:", error);
        return "I had trouble reaching the server. Please check your internet connection.";
    }
}
