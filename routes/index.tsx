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
    <div class="min-h-screen bg-black text-[#ffffff] flex flex-col justify-between py-24 px-6 font-mono">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        body {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          background-color: #000000 !important;
          color: #ffffff !important;
        }
      `,
        }}
      />

      <div />

      <main class="max-w-[500px] w-full mx-auto text-center">
        <h1 class="text-4xl font-bold tracking-[0.25em] text-white mb-4 pl-[0.25em]">
          LOJU
        </h1>
        <p class="text-[10px] text-[#555] uppercase tracking-[0.3em] mb-12">
          Personal Publishing Portal
        </p>

        <div>
          <a
            href="/notes"
            class="inline-block border border-[#333] hover:border-white text-white px-6 py-2.5 text-xs tracking-widest transition-all duration-200"
          >
            [ENTER]
          </a>
        </div>
      </main>

      <footer class="text-center text-[9px] text-[#333] tracking-widest uppercase">
        loju.ca
      </footer>
    </div>
  );
});
