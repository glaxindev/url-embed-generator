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
 * app/embed/route.ts
 *
 * Produces a full HTML document with OG + Twitter meta tags.
 * - Validates & truncates inputs defensively.
 * - Appends footer to the end of the description as a new line in bold markdown:
 *     description + "\n\n**" + footer + "**"
 *   while ensuring the resulting og:description does not exceed LIMITS.description.
 * - Emits extra og:image tags to improve compatibility with social crawlers.
 * - Returns a small responsive preview page for humans.
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params = getEmbedParams(searchParams);

  // Raw params trimmed
  const titleRaw = (params.title || "").trim();
  const descRaw = (params.desc || "").trim();
  const footerRaw = (params.footer || "").trim();
  const imageRaw = (params.image || "").trim();

  // Validate
  const titleValid = validateTitle(titleRaw);
  const descValid = validateDescription(descRaw);
  const footerValid = validateFooter(footerRaw);
  const imageValid = validateImageUrl(imageRaw);

  // Fallbacks + truncation for title
  const title = titleValid.valid
    ? titleRaw.slice(0, LIMITS.title)
    : "Untitled Card";

  // Handle description + footer composition with truncation to LIMITS.description
  // We'll append footer in markdown bold preceded by two newlines: "\n\n**footer**"
  const footerAllowed = footerValid.valid
    ? footerRaw.slice(0, LIMITS.footer)
    : "";
  const footerMarkdown = footerAllowed ? `\n\n**${footerAllowed}**` : "";

  // Start with desc (trim to LIMITS.description first)
  let baseDesc = descValid.valid
    ? descRaw.slice(0, LIMITS.description)
    : "A shareable embed card created with Dynamic Embed Generator";

  // If combined length exceeds LIMITS.description, truncate intelligently
  // Reserve length for footerMarkdown if footer exists
  let description = baseDesc;
  if (footerMarkdown) {
    const totalLen = baseDesc.length + footerMarkdown.length;
    if (totalLen <= LIMITS.description) {
      description = baseDesc + footerMarkdown;
    } else {
      // Need to shrink baseDesc to fit footerMarkdown
      const reserve = footerMarkdown.length;
      const allowedBase = LIMITS.description - reserve;
      if (allowedBase > 3) {
        // keep room for ellipsis
        const truncatedBase = baseDesc.slice(0, allowedBase - 3).trimEnd();
        description = `${truncatedBase}...${footerMarkdown}`;
      } else {
        // Not enough room for base + footer; need to shrink footer itself
        const allowedFooterContent = Math.max(0, LIMITS.description - 4); // 4 = "\n\n**" + ending "**" count heuristics (we'll handle precisely)
        const shrunkFooter = footerAllowed
          .slice(0, allowedFooterContent)
          .trim();
        const footerMd = shrunkFooter ? `\n\n**${shrunkFooter}**` : "";
        // If still too long (edge) fall back to description only truncated
        if (footerMd.length <= LIMITS.description) {
          // place only footer (if it fits), else truncate footer more
          description = footerMd.trimStart().length
            ? footerMd.trimStart()
            : baseDesc.slice(0, LIMITS.description);
          // ensure no leading newline-only content
          if (!description) description = baseDesc.slice(0, LIMITS.description);
        } else {
          description = baseDesc.slice(0, LIMITS.description);
        }
      }
    }
  } else {
    // no footer - ensure trimmed
    description = baseDesc.slice(0, LIMITS.description);
  }

  // Only allow HTTPS absolute image URLs from validation helper
  const imageUrl = imageValid.valid ? imageRaw : "";

  // Escape for HTML injection (escapeHtml should not alter asterisks; asterisks are safe for markdown)
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);
  const escapedFooter = escapeHtml(footerAllowed);
  const escapedImageUrl = escapeHtml(imageUrl);

  // Build canonical/current URL
  const currentUrl = `${request.nextUrl.origin}${request.nextUrl.pathname}${request.nextUrl.search}`;
  const escapedUrl = escapeHtml(currentUrl);

  // Image hints (recommended social image size)
  const hasImage = !!escapedImageUrl;
  const imageWidth = 1200;
  const imageHeight = 630;
  const imageType = hasImage
    ? (() => {
        const lower = escapedImageUrl.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
          return "image/jpeg";
        return "image/*";
      })()
    : "";

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
  <meta property="og:locale" content="en_US" />
  ${hasImage ? `<meta property="og:image" content="${escapedImageUrl}" />` : ""}
  ${
    hasImage
      ? `<meta property="og:image:secure_url" content="${escapedImageUrl}" />`
      : ""
  }
  ${
    hasImage ? `<meta property="og:image:width" content="${imageWidth}" />` : ""
  }
  ${
    hasImage
      ? `<meta property="og:image:height" content="${imageHeight}" />`
      : ""
  }
  ${
    hasImage
      ? `<meta property="og:image:type" content="${escapeHtml(imageType)}" />`
      : ""
  }
  ${
    hasImage
      ? `<meta property="og:image:alt" content="${
          escapedFooter || escapedTitle
        }" />`
      : ""
  }
  ${hasImage ? `<link rel="image_src" href="${escapedImageUrl}" />` : ""}

  <!-- Twitter / Card -->
  <meta name="twitter:card" content="${
    hasImage ? "summary_large_image" : "summary"
  }" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${escapedDescription}" />
  ${
    hasImage ? `<meta name="twitter:image" content="${escapedImageUrl}" />` : ""
  }
  ${
    hasImage
      ? `<meta name="twitter:image:alt" content="${
          escapedFooter || escapedTitle
        }" />`
      : ""
  }

  <!-- Security / privacy -->
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="referrer" content="no-referrer-when-downgrade" />
  <meta name="theme-color" content="#0b1220" />

  <style>
    :root{
      --bg:#07080a;
      --panel:#0f1720;
      --muted:#9aa3b2;
      --text:#e6eef6;
      --accent:#00b4d8;
      --card-radius:12px;
    }
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
    .wrap{ width:100%; max-width:760px; padding:18px; }
    .card{
      background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02));
      border-radius:var(--card-radius);
      overflow:hidden;
      box-shadow: 0 10px 30px rgba(2,6,23,0.6);
      border:1px solid rgba(255,255,255,0.03);
    }
    .media{ width:100%; display:block; max-height:420px; object-fit:cover; background:#0b1220; }
    .content{ padding:20px 22px; }
    h1{ font-size:1.45rem; margin:0 0 8px 0; line-height:1.15; color:var(--text); word-break:break-word; }
    p.lead{ margin:0 0 12px 0; color:var(--muted); font-size:0.98rem; word-break:break-word; white-space:pre-wrap; }
    .footer{ margin-top:12px; color:var(--muted); font-size:0.85rem; }
    .meta{ margin-top:14px; display:flex; align-items:center; justify-content:center; gap:6px; color:var(--muted); font-size:0.85rem; }
    a.home{ color:var(--accent); text-decoration:none; font-weight:600; }
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
        hasImage
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

  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "no-referrer-when-downgrade",
    // Keep short during testing; increase for production as needed
    "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
  };

  return new NextResponse(html, {
    status: 200,
    headers,
  });
}
