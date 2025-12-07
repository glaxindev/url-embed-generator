"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Github, Globe, Copy, Check } from "lucide-react";
import {
  validateTitle,
  validateDescription,
  validateFooter,
  validateImageUrl,
  buildShareableUrl,
  LIMITS,
} from "@/lib/sanitize";
import config from "@/config";

export default function Home() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [footer, setFooter] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // separate copy states for each button
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDiscord, setCopiedDiscord] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const descRef = useRef<HTMLTextAreaElement | null>(null);
  const copyTimer = useRef<number | null>(null);
  const discordTimer = useRef<number | null>(null);

  // auto-grow description textarea
  useEffect(() => {
    if (descRef.current) {
      descRef.current.style.height = "auto";
      descRef.current.style.height = descRef.current.scrollHeight + "px";
    }
  }, [description]);

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      if (discordTimer.current) window.clearTimeout(discordTimer.current);
    };
  }, []);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    const t = validateTitle(title);
    if (!t.valid) newErrors.title = t.error || "Invalid title";

    const d = validateDescription(description);
    if (!d.valid) newErrors.description = d.error || "Invalid description";

    const f = validateFooter(footer);
    if (!f.valid) newErrors.footer = f.error || "Invalid footer";

    const img = validateImageUrl(imageUrl);
    if (!img.valid) newErrors.image = img.error || "Invalid image URL";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, description, footer, imageUrl]);

  const shareableLink = useMemo(
    () =>
      buildShareableUrl({
        title,
        desc: description,
        footer,
        image: imageUrl,
      }),
    [title, description, footer, imageUrl]
  );

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  // Generic write-to-clipboard helper with fallback
  const writeToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // older fallback
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      }
    } catch {
      return false;
    }
  };

  const handleCopyLink = useCallback(async () => {
    if (!validateForm()) return;

    const fullUrl = `${origin}${shareableLink}`;
    const ok = await writeToClipboard(fullUrl);
    if (!ok) {
      alert("Failed to copy link to clipboard");
      return;
    }

    setCopiedLink(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopiedLink(false), 2000);
  }, [origin, shareableLink, validateForm]);

  // Copies Discord message: ||[<title>](<url>)||
  const handleCopyDiscord = useCallback(async () => {
    if (!validateForm()) return;

    const fullUrl = `${origin}${shareableLink}`;
    // Use a safe fallback title when empty
    const safeTitle = title?.trim() ? title.trim() : "Untitled Card";

    // Build Discord-formatted spoiler + link message
    const discordMessage = `[${safeTitle}](${fullUrl})`;

    const ok = await writeToClipboard(discordMessage);
    if (!ok) {
      alert("Failed to copy Discord message to clipboard");
      return;
    }

    setCopiedDiscord(true);
    if (discordTimer.current) window.clearTimeout(discordTimer.current);
    discordTimer.current = window.setTimeout(
      () => setCopiedDiscord(false),
      2000
    );
  }, [origin, shareableLink, title, validateForm]);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-slate-100">
      {/* Header: only icons on the right */}
      <header className="w-full">
        <div className="max-w-lg mx-auto px-4 py-3 flex justify-end items-center gap-2">
          <a
            href={config.socials.github}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded hover:bg-zinc-900 transition"
            aria-label="GitHub"
          >
            <Github size={18} />
          </a>
          <a
            href={config.socials.portfolio}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded hover:bg-zinc-900 transition"
            aria-label="Portfolio"
          >
            <Globe size={18} />
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Create Your <span className="text-cyan-400">Embed Card</span>
          </h1>
          <p className="text-sm text-slate-300 mt-2">
            Fill the fields to generate a clean, instantly sharable and
            customizable OpenGraph embed preview link.
          </p>
        </div>

        <div className="bg-transparent">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="The card title"
                maxLength={LIMITS.title}
                className="w-full px-4 py-3 bg-zinc-900 rounded-lg text-base text-slate-100
                  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500
                  transition transform duration-150 ease-in-out focus:-translate-y-1"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "title-error" : undefined}
              />
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>
                  {title.length}/{LIMITS.title}
                </span>
                {errors.title && (
                  <span id="title-error" className="text-red-400">
                    {errors.title}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium mb-1"
              >
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                id="description"
                ref={descRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A short description for social previews..."
                maxLength={LIMITS.description}
                className="w-full px-4 py-3 bg-zinc-900 rounded-lg text-base text-slate-100
                  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500
                  transition transform duration-150 ease-in-out focus:-translate-y-1 resize-none overflow-hidden"
                rows={3}
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? "desc-error" : undefined}
              />
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>
                  {description.length}/{LIMITS.description}
                </span>
                {errors.description && (
                  <span id="desc-error" className="text-red-400">
                    {errors.description}
                  </span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div>
              <label
                htmlFor="footer"
                className="block text-sm font-medium mb-1"
              >
                Footer (optional, Discord Unsupported)
              </label>
              <input
                id="footer"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                placeholder="Short footer text"
                maxLength={LIMITS.footer}
                className="w-full px-4 py-3 bg-zinc-900 rounded-lg text-base text-slate-100
                  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500
                  transition transform duration-150 ease-in-out focus:-translate-y-1"
                aria-invalid={!!errors.footer}
                aria-describedby={errors.footer ? "footer-error" : undefined}
              />
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>
                  {footer.length}/{LIMITS.footer}
                </span>
                {errors.footer && (
                  <span id="footer-error" className="text-red-400">
                    {errors.footer}
                  </span>
                )}
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label htmlFor="image" className="block text-sm font-medium mb-1">
                Image URL (optional, HTTPS)
              </label>
              <input
                id="image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                type="url"
                className="w-full px-4 py-3 bg-zinc-900 rounded-lg text-base text-slate-100
                  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500
                  transition transform duration-150 ease-in-out focus:-translate-y-1"
                aria-invalid={!!errors.image}
                aria-describedby={errors.image ? "image-error" : undefined}
              />
              {errors.image && (
                <div id="image-error" className="mt-1 text-xs text-red-400">
                  {errors.image}
                </div>
              )}
            </div>

            {/* Buttons: responsive (stack on small, row on larger) */}
            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCopyLink}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-zinc-950 font-semibold text-base transition ${
                  copiedLink ? "opacity-90" : ""
                }`}
                aria-label="Copy shareable link"
              >
                {copiedLink ? (
                  <span className="inline-flex items-center gap-2">
                    <Check size={18} /> Copied
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Copy size={18} /> Copy Shareable Link
                  </span>
                )}
              </button>

              <button
                onClick={handleCopyDiscord}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-900 rounded-lg border border-zinc-700 text-slate-200 font-medium text-base transition ${
                  copiedDiscord ? "opacity-90" : ""
                }`}
                aria-label="Copy Discord message"
                title='Copies "[title](link)" to clipboard'
              >
                {copiedDiscord ? (
                  <span className="inline-flex items-center gap-2">
                    <Check size={18} /> Copied Discord
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      fill="currentColor"
                      className="bi bi-discord"
                      viewBox="0 0 16 16"
                    >
                      <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
                    </svg>{" "}
                    Copy Discord Msg
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-5 text-center text-slate-400 text-sm">
        Made with ❤️ by{" "}
        <a
          href={config.socials.portfolio}
          className="text-slate-300 hover:text-slate-400"
        >
          Glaxin Dev
        </a>
      </footer>
    </div>
  );
}
