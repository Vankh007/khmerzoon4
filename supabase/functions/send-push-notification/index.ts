import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  topic?: string;
  data?: Record<string, string>;
}

interface FirebaseServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Create JWT for Firebase authentication
async function createJWT(serviceAccount: FirebaseServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1 hour expiration

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: serviceAccount.token_uri,
    iat: now,
    exp: exp,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const privateKeyPem = serviceAccount.private_key;
  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${unsignedToken}.${signatureB64}`;
}

// Get OAuth2 access token using service account
async function getAccessToken(serviceAccount: FirebaseServiceAccount): Promise<string> {
  const jwt = await createJWT(serviceAccount);

  const response = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token exchange failed:", errorText);
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, body, imageUrl, topic = 'all', data = {} } = await req.json() as NotificationPayload;

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build serviceAccount from split secrets OR full JSON
    let serviceAccount: FirebaseServiceAccount;

    const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
    const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
    const privateKeyRaw = Deno.env.get('FIREBASE_PRIVATE_KEY');

    if (projectId && clientEmail && privateKeyRaw) {
      // Use individual secrets (preferred)
      // Replace escaped newlines with actual newlines in case pasted as literal \n
      const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

      serviceAccount = {
        type: 'service_account',
        project_id: projectId,
        private_key_id: '',
        private_key: privateKey,
        client_email: clientEmail,
        client_id: '',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
      };
      console.log('Using individual FIREBASE_* secrets');
    } else {
      // Fallback to full JSON secret
      const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
      if (!serviceAccountJson) {
        console.error('Firebase secrets not configured');
        return new Response(
          JSON.stringify({ error: 'Firebase not configured. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY secrets (or FIREBASE_SERVICE_ACCOUNT_KEY).' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const trimmed = serviceAccountJson.trim();
      if (!trimmed.startsWith('{')) {
        console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. Got:', trimmed.substring(0, 50));
        return new Response(
          JSON.stringify({ error: 'FIREBASE_SERVICE_ACCOUNT_KEY must contain full JSON, not a filename.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        serviceAccount = JSON.parse(serviceAccountJson);
      } catch (parseError) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError);
        return new Response(
          JSON.stringify({ error: 'FIREBASE_SERVICE_ACCOUNT_KEY contains invalid JSON.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Using FIREBASE_SERVICE_ACCOUNT_KEY JSON');
    }

    console.log(`Sending notification to topic: ${topic}`);
    console.log(`Title: ${title}, Body: ${body}`);

    // Get access token
    const accessToken = await getAccessToken(serviceAccount);
    console.log('Successfully obtained access token');

    // Build FCM v1 message
    const message: Record<string, unknown> = {
      message: {
        topic: topic,
        notification: {
          title: title,
          body: body,
          ...(imageUrl && { image: imageUrl }),
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            channel_id: 'high_importance_channel',
            sound: 'default',
            ...(imageUrl && { image: imageUrl }),
          },
        },
      },
    };

    // Send notification using FCM v1 API
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
    
    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('FCM Error:', JSON.stringify(responseData));
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send notification', 
          details: responseData 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Notification sent successfully:', JSON.stringify(responseData));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        messageId: responseData.name 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
