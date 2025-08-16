exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: 'netlify',
      services: {
        ai: {
          groq: {
            configured: !!process.env.GROQ_API_KEY,
            model: 'llama3-8b-8192'
          }
        },
        email: {
          configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
        }
      }
    }),
  };
};