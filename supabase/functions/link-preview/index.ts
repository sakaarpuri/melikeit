import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RequestBody = {
  url?: string;
};

function extractMetaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}["'][^>]*>`,
      'i'
    );
    const tagMatch = html.match(pattern);
    if (!tagMatch) continue;
    const tag = tagMatch[0];
    const contentMatch = tag.match(/content=["']([^"']+)["']/i);
    if (contentMatch?.[1]) return contentMatch[1].trim();
  }
  return null;
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? null;
}

function extFromContentType(contentType: string): string {
  const normalized = contentType.toLowerCase().split(';')[0]?.trim();
  if (normalized === 'image/jpeg') return 'jpg';
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/webp') return 'webp';
  if (normalized === 'image/gif') return 'gif';
  return 'bin';
}

async function fetchPageHtml(pageUrl: URL): Promise<{ html: string; resolvedUrl: string } | null> {
  const response = await fetch(pageUrl.toString(), {
    redirect: 'follow',
    headers: {
      'user-agent': 'meLikesItLinkPreview/1.0',
      accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) return null;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('text/html')) return null;
  const html = await response.text();
  return { html, resolvedUrl: response.url };
}

function extractPageMetadata(html: string): { title?: string; description?: string; imageUrl?: string } {
  const title = extractMetaContent(html, ['og:title', 'twitter:title']) ?? extractTitleTag(html) ?? undefined;
  const description = extractMetaContent(html, ['og:description', 'twitter:description', 'description']) ?? undefined;
  const imageUrl = extractMetaContent(html, ['og:image', 'twitter:image', 'twitter:image:src']) ?? undefined;
  return { title, description, imageUrl };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Supabase environment is not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as RequestBody;
    const rawUrl = body.url?.trim();
    if (!rawUrl) {
      return new Response(JSON.stringify({ error: 'URL is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const screenshotUrl = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(parsedUrl.toString())}?w=1200&h=800`;
    const page = await fetchPageHtml(parsedUrl);
    const meta = page ? extractPageMetadata(page.html) : {};
    const ogImageRaw = meta.imageUrl;
    const ogImageUrl = ogImageRaw && page
      ? (() => {
        try {
          const absolute = new URL(ogImageRaw, page.resolvedUrl);
          if (!/^https?:$/i.test(absolute.protocol)) return null;
          return absolute;
        } catch {
          return null;
        }
      })()
      : null;

    let imageResponse: Response | null = null;
    let outputExt = 'jpg';
    let outputContentType = 'image/jpeg';

    if (ogImageUrl) {
      const candidate = await fetch(ogImageUrl.toString(), {
        redirect: 'follow',
        headers: { 'user-agent': 'meLikesItLinkPreview/1.0', accept: 'image/*' },
      });
      const candidateType = candidate.headers.get('content-type') ?? '';
      const candidateLength = Number(candidate.headers.get('content-length') ?? '0');
      const maxBytes = 5 * 1024 * 1024;
      if (candidate.ok && candidateType.toLowerCase().startsWith('image/') && (candidateLength === 0 || candidateLength <= maxBytes)) {
        imageResponse = candidate;
        outputContentType = candidateType || outputContentType;
        outputExt = extFromContentType(outputContentType);
      }
    }

    if (!imageResponse) {
      const screenshotResponse = await fetch(screenshotUrl);
      if (!screenshotResponse.ok) {
        return new Response(JSON.stringify({ error: 'Could not fetch link preview.' }), {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const contentType = screenshotResponse.headers.get('content-type') ?? 'image/jpeg';
      if (!contentType.toLowerCase().startsWith('image/')) {
        return new Response(JSON.stringify({ error: 'Preview response is not an image.' }), {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      imageResponse = screenshotResponse;
      outputContentType = contentType;
      outputExt = extFromContentType(outputContentType) || 'jpg';
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const previewPath = `${user.id}/link_previews/${crypto.randomUUID()}.${outputExt}`;
    const { error: uploadError } = await supabase.storage
      .from('find_images')
      .upload(previewPath, imageBuffer, {
        upsert: false,
        contentType: outputContentType,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ previewPath, title: meta.title, description: meta.description }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
