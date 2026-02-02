import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SignedUrlRequest {
  fileKey: string;
  bucket: string;
  storage?: 'storage1' | 'storage2';
  expiresIn?: number;
}

// Helper to create HMAC-SHA256
async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}

// Helper to create SHA256 hash
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate AWS Signature V4 pre-signed URL
async function generatePresignedUrl(
  endpoint: string,
  bucket: string,
  key: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  expiresIn: number
): Promise<string> {
  const service = 's3';
  const host = endpoint;
  const now = new Date();
  
  // Format dates
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  
  // Credential scope
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;
  
  // Canonical request components
  const method = 'GET';
  const canonicalUri = `/${bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
  
  // Query parameters (sorted)
  const queryParams = new Map([
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', expiresIn.toString()],
    ['X-Amz-SignedHeaders', 'host'],
  ]);
  
  // Build canonical query string (sorted)
  const sortedParams = Array.from(queryParams.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const canonicalQueryString = sortedParams
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  
  // Canonical headers
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  
  // Canonical request
  const payloadHash = 'UNSIGNED-PAYLOAD';
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  
  // String to sign
  const canonicalRequestHash = await sha256(canonicalRequest);
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');
  
  // Calculate signature
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + secretAccessKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = toHex(await hmacSha256(kSigning, stringToSign));
  
  // Build final URL
  const signedUrl = `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  
  return signedUrl;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileKey, bucket, storage = 'storage1', expiresIn = 3600 }: SignedUrlRequest = await req.json();

    if (!fileKey || !bucket) {
      throw new Error('fileKey and bucket are required');
    }

    // Get credentials from environment
    const rawEndpoint = storage === 'storage1'
      ? Deno.env.get('IDRIVE_E2_STORAGE1_ENDPOINT')
      : Deno.env.get('IDRIVE_E2_STORAGE2_ENDPOINT');

    const endpoint = rawEndpoint?.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');

    const accessKeyId = storage === 'storage1'
      ? Deno.env.get('IDRIVE_E2_STORAGE1_ACCESS_KEY')
      : Deno.env.get('IDRIVE_E2_STORAGE2_ACCESS_KEY');

    const secretAccessKey = storage === 'storage1'
      ? Deno.env.get('IDRIVE_E2_STORAGE1_SECRET_KEY')
      : Deno.env.get('IDRIVE_E2_STORAGE2_SECRET_KEY');

    const region = storage === 'storage2' ? 'ap-southeast-1' : 'us-east-1';

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error('Storage credentials not configured');
    }

    // Generate pre-signed URL using native crypto
    const signedUrl = await generatePresignedUrl(
      endpoint,
      bucket,
      fileKey,
      accessKeyId,
      secretAccessKey,
      region,
      expiresIn
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        signedUrl,
        expiresIn,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Signed URL error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
