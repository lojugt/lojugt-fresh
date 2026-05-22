import { define } from "../utils.ts";

export const handler = define.handlers({
  GET(_ctx) {
    return {
      data: {},
    };
  },
});

export default define.page(function Home() {
  return (
    <div class="min-h-screen bg-black text-[#ffffff] flex items-center justify-center font-mono">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        body {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          background-color: #000000 !important;
          color: #ffffff !important;
          margin: 0;
          padding: 0;
        }
      `,
        }}
      />

      <main class="text-center select-none">
        <h1 class="text-4xl font-bold tracking-[0.25em] pl-[0.25em] transition-opacity duration-300 hover:opacity-75">
          <a href="/notes" class="text-white no-underline hover:underline">
            LOJU
          </a>
        </h1>
      </main>
    </div>
  );
});
