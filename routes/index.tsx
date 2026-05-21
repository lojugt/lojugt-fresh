import { define } from "../utils.ts";

export const handler = define.handlers({
  GET(ctx) {
    return {
      data: {}
    };
  }
});

export default define.page(function Home() {
  return (
    <div class="min-h-screen bg-[#08090c] text-[#a9b1d6] selection:bg-[#1a1b26] selection:text-[#7aa2f7] flex flex-col justify-between py-16 px-8 font-mono">
      <style dangerouslySetInnerHTML={{ __html: `
        body {
          font-family: 'JetBrains Mono', monospace !important;
          background-color: #08090c !important;
        }
      `}} />

      {/* Top spacer for vertical balance */}
      <div />

      {/* Hero Title and Portal link */}
      <div class="max-w-md mx-auto text-center">
        <h1 class="text-6xl font-black tracking-[0.25em] text-white mb-6 select-none pl-[0.25em]">
          LOJU
        </h1>
        <div class="h-px w-16 bg-[#1b1c24] mx-auto mb-8" />
        <p class="text-[10px] text-[#565f89] uppercase tracking-[0.3em] mb-12">
          Personal Publishing Portal
        </p>
        
        <a
          href="/notes"
          class="inline-block border border-[#1b1c24] hover:border-[#7aa2f7]/40 bg-[#12131a]/40 hover:bg-[#12131a]/80 text-[#7aa2f7] hover:text-white px-8 py-3.5 text-xs tracking-widest transition-all duration-200"
        >
          [ENTER_PORTAL]
        </a>
      </div>

      {/* Footer system status */}
      <div class="max-w-xs mx-auto text-center text-[9px] text-[#565f89] tracking-wider space-y-1">
        <div>HOST: loju.ca</div>
        <div>STATUS: ACTIVE</div>
      </div>
    </div>
  );
});
