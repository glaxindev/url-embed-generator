import he from "he";

export interface EmbedParams {
  title: string;
  desc: string;
  footer: string;
  image?: string;
}

export const LIMITS = {
  title: 200,
  description: 1000,
  footer: 200,
};

export function escapeHtml(text: string): string {
  return he.escape(text);
}

export function validateTitle(title: string): {
  valid: boolean;
  error?: string;
} {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: "Title is required" };
  }
  if (title.length > LIMITS.title) {
    return {
      valid: false,
      error: `Title must be ${LIMITS.title} characters or less`,
    };
  }
  return { valid: true };
}

export function validateDescription(desc: string): {
  valid: boolean;
  error?: string;
} {
  if (!desc || desc.trim().length === 0) {
    return { valid: false, error: "Description is required" };
  }
  if (desc.length > LIMITS.description) {
    return {
      valid: false,
      error: `Description must be ${LIMITS.description} characters or less`,
    };
  }
  return { valid: true };
}

export function validateFooter(footer: string): {
  valid: boolean;
  error?: string;
} {
  if (footer && footer.length > LIMITS.footer) {
    return {
      valid: false,
      error: `Footer must be ${LIMITS.footer} characters or less`,
    };
  }
  return { valid: true };
}

export function validateImageUrl(imageUrl: string): {
  valid: boolean;
  error?: string;
} {
  if (!imageUrl || imageUrl.trim().length === 0) {
    return { valid: true };
  }

  try {
    const url = new URL(imageUrl);
    if (url.protocol !== "https:") {
      return { valid: false, error: "Image URL must be HTTPS only" };
    }

    // const allowedHosts = [
    //   'pexels.com',
    //   'unsplash.com',
    //   'pixabay.com',
    //   'images.pexels.com',
    //   'images.unsplash.com',
    //   'cdn.pixabay.com',
    // ];

    // const isAllowedHost = allowedHosts.some((host) => url.hostname.includes(host));

    if (!url.hostname.includes("localhost")) {
      return { valid: true };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

export function buildShareableUrl(params: Partial<EmbedParams>): string {
  const searchParams = new URLSearchParams();

  if (params.title) {
    searchParams.set("title", params.title);
  }
  if (params.desc) {
    searchParams.set("desc", params.desc);
  }
  if (params.footer) {
    searchParams.set("footer", params.footer);
  }
  if (params.image) {
    searchParams.set("image", params.image);
  }

  return `/embed?${searchParams.toString()}`;
}

export function getEmbedParams(
  searchParams: URLSearchParams
): Partial<EmbedParams> {
  return {
    title: searchParams.get("title") || "",
    desc: searchParams.get("desc") || "",
    footer: searchParams.get("footer") || "",
    image: searchParams.get("image") || undefined,
  };
}
