import { define } from "../utils.ts";

export default define.page(function App({ Component, state }) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{state.title ?? "Lojugt Publishing"}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/styles.css" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          body {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            background-color: #000000;
            color: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
        `,
          }}
        />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});
