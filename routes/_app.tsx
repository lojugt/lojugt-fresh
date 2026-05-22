import { CSS } from "@deno/gfm";
import { define } from "../utils.ts";

export default define.page(function App({ Component, state }) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{state.title ? `${state.title} | Loju` : "Loju"}</title>
        {state.description && <meta name="description" content={state.description} />}
        {state.tags && state.tags.length > 0 && (
          <meta name="keywords" content={state.tags.join(", ")} />
        )}
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={state.title ? `${state.title} | Loju` : "Loju"} />
        {state.description && (
          <meta property="og:description" content={state.description} />
        )}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={state.title ? `${state.title} | Loju` : "Loju"} />
        {state.description && (
          <meta name="twitter:description" content={state.description} />
        )}

        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <link rel="stylesheet" href="/styles.css" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            const savedTheme = localStorage.getItem('loju-theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
          })();
        ` }} />
      </head>
      <body>
        <Component />
        <script dangerouslySetInnerHTML={{ __html: `
          function updateLojuThemeUI() {
            const theme = document.documentElement.getAttribute('data-theme') || 'light';
            
            const statusEl = document.getElementById('loju-theme-status');
            if (statusEl) {
              statusEl.innerText = theme === 'dark' ? 'NIGHT' : 'DAY';
            }
            
            const iconEl = document.querySelector('.loju-toggle-icon');
            if (iconEl) {
              iconEl.style.transform = 'scale(1.2) rotate(360deg)';
              setTimeout(() => {
                iconEl.style.transform = '';
              }, 300);
            }

            const markdownBody = document.querySelector('.markdown-body');
            if (markdownBody) {
              if (theme === 'dark') {
                markdownBody.setAttribute('data-color-mode', 'dark');
                markdownBody.setAttribute('data-dark-theme', 'dark');
              } else {
                markdownBody.setAttribute('data-color-mode', 'light');
                markdownBody.setAttribute('data-light-theme', 'light');
              }
            }
          }

          window.toggleLojuTheme = function() {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('loju-theme', newTheme);
            updateLojuThemeUI();
          };

          document.addEventListener('DOMContentLoaded', updateLojuThemeUI);
          if (document.readyState !== 'loading') {
            updateLojuThemeUI();
          }
        ` }} />
      </body>
    </html>
  );
});
