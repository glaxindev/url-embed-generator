import { NextRequest, NextResponse } from "next/server";
import {
  escapeHtml,
  validateTitle,
  validateDescription,
  validateFooter,
  validateImageUrl,
  getEmbedParams,
  LIMITS,
} from "@/lib/sanitize";

/**
 * /embed route (server)
 * - Produces a full HTML document (server-side) with safe, escaped OG + Twitter meta tags.
 * - Validates & truncates inputs to avoid XSS / huge payloads.
 * - Returns a compact, responsive, dark-styled preview page for humans.
 * - Adds safe HTTP headers and reasonable Cache-Control.
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params = getEmbedParams(searchParams);

  // Validate inputs using helpers; fallback to safe defaults
  const titleRaw = (params.title || "").trim();
  const descRaw = (params.desc || "").trim();
  const footerRaw = (params.footer || "").trim();
  const imageRaw = (params.image || "").trim();

  const titleValid = validateTitle(titleRaw);
  const descValid = validateDescription(descRaw);
  const footerValid = validateFooter(footerRaw);
  const imageValid = validateImageUrl(imageRaw);

  // Apply fallbacks and truncate to safe lengths (defensive)
  const title = titleValid.valid
    ? titleRaw.slice(0, LIMITS.title)
    : "Untitled Card";

  const description = descValid.valid
    ? descRaw.slice(0, LIMITS.description)
    : "A shareable embed card created with Dynamic Embed Generator";

  const footer = footerValid.valid ? footerRaw.slice(0, LIMITS.footer) : "";

  // Only allow HTTPS absolute image URLs from validation helper
  const imageUrl = imageValid.valid ? imageRaw : "";

  // Escape all values before injecting into HTML
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);
  const escapedFooter = escapeHtml(footer);
  const escapedImageUrl = escapeHtml(imageUrl);

  // Build the canonical URL the crawler sees
  const currentUrl = `${request.nextUrl.origin}${request.nextUrl.pathname}${request.nextUrl.search}`;
  const escapedUrl = escapeHtml(currentUrl);

  // Minimal, responsive, accessible HTML preview (dark theme, cyan accents)
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapedTitle}</title>
  <meta name="description" content="${escapedDescription}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapedUrl}" />
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${escapedDescription}" />
  ${
    escapedImageUrl
      ? `<meta property="og:image" content="${escapedImageUrl}" />`
      : ""
  }
  <meta property="og:site_name" content="Dynamic OG Embed" />
  <meta property="og:locale" content="en_US" />

  <!-- Twitter -->
  <meta name="twitter:card" content="${
    escapedImageUrl ? "summary_large_image" : "summary"
  }" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${escapedDescription}" />
  ${
    escapedImageUrl
      ? `<meta name="twitter:image" content="${escapedImageUrl}" />`
      : ""
  }

  <!-- Security / privacy -->
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="referrer" content="no-referrer-when-downgrade" />
  <meta name="theme-color" content="#0b1220" />

  <style>
    :root{
      --bg:#07080a;           /* darker background */
      --panel:#0f1720;        /* card panel */
      --muted:#9aa3b2;
      --text:#e6eef6;
      --accent:#00b4d8;
      --card-radius:12px;
    }

    /* Reset */
    *,*::before,*::after{box-sizing:border-box}
    html,body{height:100%}
    body{
      margin:0;
      font-family:Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
      background:var(--bg);
      color:var(--text);
      -webkit-font-smoothing:antialiased;
      -moz-osx-font-smoothing:grayscale;
      line-height:1.45;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
      min-height:100vh;
    }

    .wrap{
      width:100%;
      max-width:760px;
      padding:18px;
    }

    .card{
      background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02));
      border-radius:var(--card-radius);
      overflow:hidden;
      box-shadow: 0 10px 30px rgba(2,6,23,0.6);
      border:1px solid rgba(255,255,255,0.03);
    }

    .media{
      width:100%;
      display:block;
      max-height:420px;
      object-fit:cover;
      background:#0b1220;
    }

    .content{
      padding:20px 22px;
    }

    h1{
      font-size:1.45rem; /* responsive */
      margin:0 0 8px 0;
      line-height:1.15;
      color:var(--text);
      word-break:break-word;
    }

    p.lead{
      margin:0 0 12px 0;
      color:var(--muted);
      font-size:0.98rem;
      word-break:break-word;
    }

    .footer{
      margin-top:12px;
      color:var(--muted);
      font-size:0.85rem;
    }

    .meta{
      margin-top:14px;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:6px;
      color:var(--muted);
      font-size:0.85rem;
    }

    a.home{
      color:var(--accent);
      text-decoration:none;
      font-weight:600;
    }

    /* responsive tweaks */
    @media (max-width:640px){
      .wrap{padding:10px; max-width:520px}
      .content{padding:16px}
      h1{font-size:1.2rem}
      p.lead{font-size:0.95rem}
    }
  </style>
</head>
<body>
  <main class="wrap" role="main" aria-label="Embed preview">
    <article class="card" aria-live="polite">
      ${
        escapedImageUrl
          ? `<img src="${escapedImageUrl}" alt="${escapedTitle}" class="media" loading="eager">`
          : ""
      }
      <div class="content">
        <h1>${escapedTitle}</h1>
        <p class="lead">${escapedDescription}</p>
        ${escapedFooter ? `<div class="footer">${escapedFooter}</div>` : ""}
        <div class="meta">
          <span>Created with</span>
          <a class="home" href="/" rel="noopener noreferrer">Dynamic Embed Generator</a>
        </div>
      </div>
    </article>
  </main>
</body>
</html>`;

  // Security & caching headers
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    // SAMEORIGIN prevents clickjacking while allowing same-origin embedding if needed
    "X-Frame-Options": "SAMEORIGIN",
    // Prevent MIME-sniffing and reduce referrer leakage
    "Referrer-Policy": "no-referrer-when-downgrade",
    // Reasonable CDN cache: 1 hour, with stale-while-revalidate for quick refresh behavior
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
  };

  return new NextResponse(html, {
    status: 200,
    headers,
  });
}
