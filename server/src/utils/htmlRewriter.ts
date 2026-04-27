import * as cheerio from 'cheerio'

/**
 * Rewrite proxied HTML so that it displays correctly inside an <iframe>.
 *
 * 1. Injects a `<base>` tag pointing at the target origin so relative
 *    resource URLs (images, CSS, JS) resolve correctly.
 * 2. Converts relative `src` / `href` attributes on resource elements
 *    to absolute URLs as a safety net.
 * 3. Rewrites CSS `url()` references in `<style>` blocks and inline
 *    `style` attributes.
 * 4. Injects a small script that intercepts link clicks and form
 *    submissions, forwarding them to the parent frame via
 *    `postMessage` so the address bar stays in sync and navigation
 *    continues through the proxy.
 */
export function rewriteHtml(html: string, targetUrl: string): string {
  const base = new URL(targetUrl)
  const origin = base.origin

  const $ = cheerio.load(html)

  /* ---------------------------------------------------------------
     1. Inject <base> tag
     --------------------------------------------------------------- */
  $('base').remove()

  if ($('head').length > 0) {
    $('head').prepend(`<base href="${origin}/" />`)
  } else if ($('html').length > 0) {
    $('html').prepend(`<head><base href="${origin}/" /></head>`)
  } else {
    // Bare HTML fragment – just prepend
    $.root().prepend(`<base href="${origin}/" />`)
  }

  /* ---------------------------------------------------------------
     2. Rewrite resource URLs to absolute
     --------------------------------------------------------------- */
  const resourceSelectors: [string, string][] = [
    ['img', 'src'],
    ['img', 'srcset'],
    ['script', 'src'],
    ['link[rel="stylesheet"]', 'href'],
    ['link[rel="icon"]', 'href'],
    ['link[rel="shortcut icon"]', 'href'],
    ['link[rel="apple-touch-icon"]', 'href'],
    ['link[rel="preload"]', 'href'],
    ['link[rel="prefetch"]', 'href'],
    ['source', 'src'],
    ['source', 'srcset'],
    ['video', 'src'],
    ['video', 'poster'],
    ['audio', 'src'],
    ['embed', 'src'],
    ['object', 'data'],
    ['input[type="image"]', 'src'],
  ]

  for (const [selector, attr] of resourceSelectors) {
    $(selector).each((_i, el) => {
      const val = $(el).attr(attr)
      if (!val) return
      if (attr === 'srcset') {
        $(el).attr(attr, rewriteSrcset(val, targetUrl))
      } else {
        $(el).attr(attr, toAbsolute(val, targetUrl))
      }
    })
  }

  /* ---------------------------------------------------------------
     3. Rewrite CSS url() in <style> blocks & inline styles
     --------------------------------------------------------------- */
  $('style').each((_i, el) => {
    const css = $(el).html()
    if (css) $(el).html(rewriteCssUrls(css, targetUrl))
  })

  $('[style]').each((_i, el) => {
    const style = $(el).attr('style')
    if (style) $(el).attr('style', rewriteCssUrls(style, targetUrl))
  })

  /* ---------------------------------------------------------------
     4. Inject navigation interceptor script
     --------------------------------------------------------------- */
  const script = buildInterceptorScript()
  if ($('body').length > 0) {
    $('body').append(script)
  } else {
    $.root().append(script)
  }

  return $.html()
}

/* ==================================================================
   Helpers
   ================================================================== */

/**
 * Convert a (potentially relative) URL to an absolute one.
 * Returns the original string unchanged for data:, blob:,
 * javascript: and protocol-relative URLs.
 */
function toAbsolute(raw: string, baseUrl: string): string {
  const trimmed = raw.trim()
  if (
    !trimmed ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('#')
  ) {
    return raw
  }
  try {
    return new URL(trimmed, baseUrl).href
  } catch {
    return raw
  }
}

/** Rewrite every candidate inside an `srcset` attribute. */
function rewriteSrcset(srcset: string, baseUrl: string): string {
  return srcset
    .split(',')
    .map((entry) => {
      const parts = entry.trim().split(/\s+/)
      if (parts.length === 0) return entry
      parts[0] = toAbsolute(parts[0], baseUrl)
      return parts.join(' ')
    })
    .join(', ')
}

/** Rewrite `url(...)` references inside CSS text. */
function rewriteCssUrls(css: string, baseUrl: string): string {
  return css.replace(
    /url\(\s*(['"]?)(?!data:|blob:|https?:\/\/|\/\/)(.*?)\1\s*\)/g,
    (_match, quote: string, path: string) => {
      const abs = toAbsolute(path, baseUrl)
      return `url(${quote}${abs}${quote})`
    },
  )
}

/**
 * Build a `<script>` tag that is injected into the proxied HTML page.
 *
 * It intercepts navigation events (link clicks, form submissions,
 * programmatic `window.open`) and forwards them to the parent frame
 * via `postMessage`, so the WebDesk browser can update its address
 * bar and load the new page through the proxy.
 */
function buildInterceptorScript(): string {
  // The script is intentionally written as ES5-compatible code so it
  // works in the widest range of documents.
  return `<script data-webdesk-proxy>
(function () {
  /* --- Link click interception ----------------------------------- */
  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (!el || !el.href) return;

    var href = el.href;
    if (
      href.indexOf('javascript:') === 0 ||
      href === '#' ||
      href.charAt(0) === '#'
    ) return;

    // Let _blank links open normally (new window)
    if (el.target === '_blank') return;

    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({ type: 'webdesk-navigate', url: href }, '*');
  }, true);

  /* --- Form submission interception ------------------------------ */
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;

    var method = (form.method || 'GET').toUpperCase();
    if (method !== 'GET') return; // only handle GET forms

    e.preventDefault();
    var action = form.action || location.href;
    var fd = new FormData(form);
    var qs = new URLSearchParams(fd).toString();
    var url = action + (action.indexOf('?') > -1 ? '&' : '?') + qs;
    window.parent.postMessage({ type: 'webdesk-navigate', url: url }, '*');
  }, true);

  /* --- Title reporting ------------------------------------------- */
  function reportTitle() {
    if (document.title) {
      window.parent.postMessage(
        { type: 'webdesk-title', title: document.title },
        '*'
      );
    }
  }

  reportTitle();

  var titleEl = document.querySelector('title');
  if (titleEl) {
    new MutationObserver(reportTitle).observe(titleEl, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  /* --- Favicon reporting ----------------------------------------- */
  var iconLink =
    document.querySelector('link[rel="icon"]') ||
    document.querySelector('link[rel="shortcut icon"]');
  if (iconLink && iconLink.href) {
    window.parent.postMessage(
      { type: 'webdesk-favicon', href: iconLink.href },
      '*'
    );
  }
})();
</script>`
}
