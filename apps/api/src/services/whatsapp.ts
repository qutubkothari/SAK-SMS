const SAK_API_URL = process.env.SAK_API_URL || 'http://13.201.102.10/api/v1';
const SAK_SESSION_ID = process.env.SAK_SESSION_ID || '';
const SAK_API_KEY = process.env.SAK_API_KEY || '';

export async function sendWhatsAppMessage(params: {
  to: string;
  message: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!SAK_SESSION_ID || !SAK_API_KEY) {
      console.error('SAK WhatsApp credentials not configured');
      return { success: false, error: 'WhatsApp not configured' };
    }

    const response = await fetch(`${SAK_API_URL}/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SAK_API_KEY
      },
      body: JSON.stringify({
        sessionId: SAK_SESSION_ID,
        to: params.to.replace(/^\+/, ''), // Remove leading +
        message: params.message
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send WhatsApp message:', error);
      return { success: false, error: `WhatsApp API error: ${response.status}` };
    }

    const result = await response.json() as { messageId?: string };
    console.log(`WhatsApp message sent to ${params.to}: ${result.messageId || 'success'}`);
    
    return { 
      success: true, 
      messageId: result.messageId 
    };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
