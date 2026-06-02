import type { StatsState } from "@/engine/AimEngine";

export function Reticles() {
  return (
    <>
      <div className="reticle tl" />
      <div className="reticle tr" />
      <div className="reticle bl" />
      <div className="reticle br" />
    </>
  );
}

export function Hud({ stats }: { stats: StatsState }) {
  return (
    <div className="hud-top">
      <div className="stat">
        <div className="v">{stats.score}</div>
        <div className="k">Score</div>
      </div>
      <div className="stat time">
        <div className="v">{stats.time.toFixed(1)}</div>
        <div className="k">Time</div>
      </div>
      <div className="stat">
        <div className="v">{stats.acc}%</div>
        <div className="k">Acc</div>
      </div>
    </div>
  );
}

export function GameStyles() {
  return (
    <style>{`
    :root{
      --ink:#0f1923; --ink2:#16222e; --ink3:#0a121a;
      --edge:#243441; --edge2:#33495a; --red:#ff4655;
      --bone:#ece8e1; --steel:#5d7282; --steel2:#8ba0ac; --mint:#38e0a6;
      --fd:"Bahnschrift","DIN Condensed","Oswald","Arial Narrow",system-ui,sans-serif;
      --fu:"Inter","Segoe UI",system-ui,-apple-system,sans-serif;
      --fm:ui-monospace,"SF Mono","Cascadia Mono","Roboto Mono",Menlo,Consolas,monospace;
    }
    html,body{height:100%;margin:0;overflow:hidden;background:var(--ink);}
    #app{position:fixed;inset:0;font-family:var(--fu);color:var(--bone);-webkit-font-smoothing:antialiased;}
    #app ::selection{background:var(--red);color:var(--ink);}
    .game-canvas{position:fixed;inset:0;display:block;z-index:0;}

    .hud{position:absolute;inset:0;pointer-events:none;z-index:4;display:none;}
    .hud.show{display:block;}
    .hud-top{position:absolute;top:20px;left:50%;transform:translateX(-50%);display:flex;gap:2px;}
    .stat{position:relative;background:rgba(10,18,26,.78);border-top:1px solid var(--edge2);padding:9px 22px 8px;text-align:center;min-width:96px;}
    .stat .v{font-family:var(--fm);font-size:23px;font-weight:700;line-height:1;letter-spacing:-1px;font-variant-numeric:tabular-nums;}
    .stat .k{font-family:var(--fd);font-size:10px;letter-spacing:3px;color:var(--steel);text-transform:uppercase;margin-top:6px;}
    .stat.time{background:rgba(255,70,85,.14);}.stat.time .v,.stat.time .k{color:var(--red);}
    .stat::before,.stat::after{content:"";position:absolute;top:0;width:7px;height:7px;}
    .stat::before{left:0;border-left:2px solid var(--red);border-top:2px solid var(--red);}
    .stat::after{right:0;border-right:2px solid var(--red);border-top:2px solid var(--red);}

    .overlay{position:absolute;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(8,14,20,.55),rgba(8,14,20,.92));}
    .overlay::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 3px);}
    .reticle{position:absolute;width:26px;height:26px;z-index:2;pointer-events:none;}
    .reticle.tl{top:22px;left:22px;border-left:2px solid var(--edge2);border-top:2px solid var(--edge2);}
    .reticle.tr{top:22px;right:22px;border-right:2px solid var(--edge2);border-top:2px solid var(--edge2);}
    .reticle.bl{bottom:22px;left:22px;border-left:2px solid var(--edge2);border-bottom:2px solid var(--edge2);}
    .reticle.br{bottom:22px;right:22px;border-right:2px solid var(--edge2);border-bottom:2px solid var(--edge2);}

    select{width:100%;background:var(--ink3);border:1px solid var(--edge);border-bottom:2px solid var(--edge2);color:var(--bone);padding:10px 12px;font-family:var(--fm);font-size:13px;outline:none;transition:.14s;appearance:none;}
    select:focus{border-bottom-color:var(--red);}
    input[type=color]{width:100%;height:40px;background:var(--ink3);border:1px solid var(--edge);cursor:pointer;padding:3px;}
    input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;margin:10px 0;background:var(--edge2);outline:none;}
    input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:18px;background:var(--red);cursor:pointer;box-shadow:0 0 0 1px var(--ink);}
    input[type=range]::-moz-range-thumb{width:14px;height:18px;border:none;background:var(--red);cursor:pointer;}
    .toast{position:absolute;bottom:26px;left:50%;transform:translateX(-50%);z-index:20;background:var(--ink2);border-top:2px solid var(--red);color:var(--bone);padding:12px 18px;font-family:var(--fm);font-size:12px;letter-spacing:.5px;max-width:80vw;text-align:center;}
    `}</style>
  );
}
