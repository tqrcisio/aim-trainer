import type { CrosshairParams } from "@/lib/crosshair";

export function CrosshairRenderer({
  params,
  size = 64,
  className,
}: {
  params: CrosshairParams;
  size?: number;
  className?: string;
}) {
  const S = size / 64;
  const cx = size / 2;
  const outline = params.outline > 0 ? `0 0 0 1px rgba(0,0,0,${params.outline})` : undefined;

  const arm = (dir: "top" | "bottom" | "left" | "right", outer = false) => {
    const t = (outer ? params.outerT : params.innerT) * S;
    const l = (outer ? params.outerL : params.innerL) * S;
    const o = (outer ? params.outerO : params.innerO) * S;
    const a = outer ? params.outerA : params.innerA;
    const style: React.CSSProperties = {
      position: "absolute",
      backgroundColor: params.color,
      opacity: a,
      boxShadow: outline,
    };
    if (dir === "top")    return <span key={`${outer ? "o" : "i"}-t`} style={{ ...style, width: t, height: l, left: cx - t / 2, top: cx - o - l }} />;
    if (dir === "bottom") return <span key={`${outer ? "o" : "i"}-b`} style={{ ...style, width: t, height: l, left: cx - t / 2, top: cx + o }} />;
    if (dir === "left")   return <span key={`${outer ? "o" : "i"}-l`} style={{ ...style, width: l, height: t, left: cx - o - l, top: cx - t / 2 }} />;
    return                <span key={`${outer ? "o" : "i"}-r`} style={{ ...style, width: l, height: t, left: cx + o, top: cx - t / 2 }} />;
  };

  const DIRS = ["top", "bottom", "left", "right"] as const;
  return (
    <div className={className} style={{ position: "relative", width: size, height: size }}>
      {params.innerVisible && DIRS.map((d) => arm(d))}
      {params.outerVisible && DIRS.map((d) => arm(d, true))}
      {params.dot && (
        <span style={{
          position: "absolute",
          width: params.innerT * S,
          height: params.innerT * S,
          backgroundColor: params.color,
          opacity: params.innerA,
          left: cx - (params.innerT * S) / 2,
          top: cx - (params.innerT * S) / 2,
          boxShadow: outline,
        }} />
      )}
    </div>
  );
}
