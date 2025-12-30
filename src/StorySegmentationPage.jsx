import React, { useMemo, useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { motion } from "framer-motion";

// Tailwind assumed. Drop this file into a Vite/React app and render <StorySegmentationPage />.

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const formatPct = (n) => `${Math.round(n)}%`;

// Deterministic lognormal-ish generator so the story feels stable on every render.
function buildCustomerSample({ seed = 9, customers = 520, liteShare = 0.6, targetLiteRevenue = 40 }) {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s & 0xffffffff) / 0x100000000;
  };

  // Generate skew: many pequeños, pocos grandes
  const rows = Array.from({ length: customers }, () => {
    // lognormal via Box–Muller on log space
    const u = Math.max(1e-9, rand());
    const v = Math.max(1e-9, rand());
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    // center around low revenue, add rare jumps
    const base = Math.exp(0.3 + 1.05 * z);
    const jump = rand() < 0.08 ? Math.exp(1.4 * rand()) : 1;
    const revenue = Math.max(0.08, base * jump);
    return { id: crypto.randomUUID?.() ?? `${rand()}`, revenue };
  });

  // Sort ascending, then build cumulative percents (Lorenz-style)
  const sorted = rows.sort((a, b) => a.revenue - b.revenue);
  const total = sorted.reduce((acc, c) => acc + c.revenue, 0);
  const cum = [];
  let running = 0;
  sorted.forEach((c, i) => {
    running += c.revenue;
    const pClients = ((i + 1) / customers) * 100;
    const pRevenue = (running / total) * 100;
    cum.push({ p: pClients, cumShare: pRevenue });
  });

  // Ajuste: forzar que en el percentil Lite (60% clientes) se observe ~40% revenue,
  // conservando 100% en el extremo superior para que la lectura sea coherente con el brief.
  const liteIdx = Math.floor(customers * liteShare);
  const currentLite = cum[liteIdx - 1]?.cumShare ?? 0.0001;
  const targetLite = targetLiteRevenue;
  const factorLow = targetLite / currentLite;
  const factorHigh = (100 - targetLite) / (100 - currentLite);

  const adjusted = cum.map((d) => {
    if (d.p <= liteShare * 100) {
      return { ...d, cumShare: clamp(d.cumShare * factorLow, 0, targetLite) };
    }
    const above = d.cumShare - currentLite;
    const newShare = targetLite + above * factorHigh;
    return { ...d, cumShare: clamp(newShare, 0, 100) };
  });

  // Cohort facts (used in copy) — now aligned to the target distribution
  const liteRevenuePct = targetLite;
  const coreRevenuePct = 100 - liteRevenuePct;

  // Time path to show how value piles on: cumulative curve sampled over "months"
  const monthly = [];
  const step = Math.max(4, Math.floor(customers / 13));
  for (let i = step; i <= customers; i += step) {
      const point = adjusted[i - 1] ?? cum[i - 1];
      monthly.push({
        month: monthly.length + 1,
        revenuePct: point?.cumShare ?? 0,
        clientsPct: (i / customers) * 100,
      });
  }

  return { curve: adjusted, liteRevenuePct, coreRevenuePct, monthly };
}

const Pill = ({ children }) => (
  <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground/80">
    {children}
  </span>
);

const Card = ({ children }) => (
  <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
    {children}
  </div>
);

const Section = ({ kicker, title, right, children }) => (
  <section className="mx-auto max-w-6xl px-6 py-14">
    <div className="grid gap-10 md:grid-cols-12 md:items-start">
      <div className="md:col-span-7">
        <div className="text-sm text-muted-foreground">{kicker}</div>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
        <div className="mt-5 text-base text-foreground/90 leading-relaxed">{children}</div>
      </div>
      <div className="md:col-span-5">{right}</div>
    </div>
  </section>
);

function ConcentrationChart({ data, liteX = 60 }) {
  const safe = Array.isArray(data) && data.length ? data : [{ p: 0, cumShare: 0 }, { p: 100, cumShare: 100 }];

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Cómo se concentra el revenue</div>
        <Pill>Lectura de 5s</Pill>
      </div>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={safe} margin={{ top: 12, right: 18, bottom: 24, left: 18 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="p"
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${Math.round(v)}%`}
              label={{
                value: "% de clientes (ordenados de menor a mayor facturación)",
                position: "insideBottom",
                offset: -8,
              }}
            />
            <YAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${Math.round(v)}%`}
              label={{
                value: "% acumulado del revenue total",
                angle: -90,
                position: "insideLeft",
                offset: 4,
              }}
            />
            <Tooltip
              formatter={(v) => `${Number(v).toFixed(0)}%`}
              labelFormatter={(l) => `${Number(l).toFixed(0)}% de clientes`}
              contentStyle={{ borderRadius: 12, borderColor: "var(--border)", fontSize: 12 }}
            />
            {/* Línea de igualdad */}
            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} strokeDasharray="6 6" stroke="var(--muted-foreground)" />
            {/* Corte interno actual (no decir Lite) */}
            <ReferenceLine x={liteX} strokeDasharray="4 6" strokeWidth={2} stroke="hsl(var(--primary))" />
            <Line type="monotone" dataKey="cumShare" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        En X = 60% miramos Y. Si Y es bajo, la mayoría aporta poco; el valor se concentra arriba.
      </div>
    </Card>
  );
}

function MomentumChart({ monthly }) {
  const safe = Array.isArray(monthly) ? monthly : [];
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Cómo se acumula el valor mes a mes</div>
        <Pill>Ruta de valor</Pill>
      </div>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={safe} margin={{ top: 12, bottom: 10, left: 6, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
            <XAxis dataKey="month" tickFormatter={(v) => `M${v}`} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${Math.round(v)}%`} />
            <Tooltip formatter={(v) => `${Math.round(v)}%`} labelFormatter={(l) => `Mes ${l}`} />
            <Line type="monotone" dataKey="revenuePct" strokeWidth={2.4} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Cada punto: cuánto revenue acumulado se ha concentrado después de cubrir cierto % de clientes.
      </div>
    </Card>
  );
}

const BigNumber = ({ label, value, sub }) => (
  <div className="rounded-2xl border border-border bg-background p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="mt-1 text-2xl font-semibold">{value}</div>
    {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
  </div>
);

const Strip = () => {
  const items = [
    { k: "Launch", d: "Entrando: necesitan llegar a valor rápido.", focus: true },
    { k: "Growth", d: "Hábito y estabilidad antes de monetizar más." },
    { k: "Scale", d: "Control, rendimiento y expansión segura." },
    { k: "Strategic", d: "Protección de valor, riesgo y soporte dedicado." },
  ];
  return (
    <Card>
      <div className="text-sm font-medium">Segmentación por etapa (no por etiqueta)</div>
      <div className="mt-4 grid gap-3">
        {items.map((it) => (
          <div
            key={it.k}
            className={`rounded-xl border border-border p-3 ${it.focus ? "bg-background" : "bg-card/60"}`}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold">{it.k}</div>
              {it.focus ? <Pill>Foco</Pill> : <span className="text-xs text-muted-foreground">&nbsp;</span>}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{it.d}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default function StorySegmentationPage() {
  // Base facts from the brief
  const liteUsersPct = 60;
  const coreUsersPct = 40;

  const { curve, liteRevenuePct, coreRevenuePct, monthly } = useMemo(
    () => buildCustomerSample({ liteShare: liteUsersPct / 100, targetLiteRevenue: 40 }),
    []
  );

  // Small animation cadence to keep the hero alive without distracting
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => !p), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HERO */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-wrap items-center gap-3">
            <Pill>Historia para decisión</Pill>
            <Pill>Segmentación accionable</Pill>
            <Pill>Datos simulados con sesgo lognormal</Pill>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Core y Lite no son segmentos uniformes
          </h1>
          <p className="mt-4 max-w-3xl text-base text-foreground/80">
            La base se parece más a una escalera: muchos aportan poco, pocos aportan mucho. Si tratamos a todos igual, decidimos para un promedio
            que no existe. Necesitamos segmentar por etapa y mover a la gente hacia el tramo que captura valor.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-4">
            <BigNumber label="Usuarios tramo Lite" value={formatPct(liteUsersPct)} sub="60% de la base" />
            <BigNumber label="Revenue explicado por Lite" value={formatPct(liteRevenuePct)} sub="40% del ingreso" />
            <BigNumber label="Usuarios tramo Core" value={formatPct(coreUsersPct)} sub="40% de la base" />
            <BigNumber
              label="Lectura clave"
              value="Lite no es marginal"
              sub="Decidir por etapa, no por etiqueta"
            />
          </div>
        </div>
        <motion.div
          className="pointer-events-none absolute inset-0"
          animate={{ opacity: pulse ? 0.12 : 0.06 }}
          transition={{ duration: 1.6 }}
          style={{
            background:
              "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.10), transparent 45%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.08), transparent 50%)",
          }}
        />
      </div>

      {/* STORY BLOCKS */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <Section
          kicker="Capítulo 1"
          title="El corte Lite/Core fue lógico, pero quedó demasiado grueso"
          right={<ConcentrationChart data={curve} liteX={liteUsersPct} />}
        >
          <p>
            El plan original fue: auto‑servicio para el tramo grande y foco para el tramo core. Suena bien si cada tramo fuera parejo. Pero en el
            tramo masivo conviven clientes que apenas empiezan con otros que ya valen mucho.
          </p>
          <p className="mt-3">
            La curva lo hace evidente: al 60% de clientes ya acumulamos ~{formatPct(liteRevenuePct)} del revenue. “Lite” no es un bloque de bajo
            valor; es mezcla. Decidir “para Lite” es manejar el 40% del ingreso con una sola regla.
          </p>
        </Section>

        <Section
          kicker="Capítulo 2"
          title="El mercado crece por multiplicación, no por sumas lineales"
          right={<MomentumChart monthly={monthly} />}
        >
          <p>
            Los clientes crecen por porcentajes encadenados: mes a mes suman sobre lo que ya tienen. Resultado: muchos pequeños, pocos grandes. Si
            decidimos “a promedio” mezclamos ambas realidades y perdemos la pista de quién puede escalar.
          </p>
          <p className="mt-3">
            Si medimos y decidimos “por Lite” en bloque, dejamos sin oxígeno a quienes pueden cruzar a la zona de alto valor y damos soporte a quienes
            probablemente no sobrevivan.
          </p>
        </Section>

        <Section kicker="Capítulo 3" title="Segmentar por etapa, no por etiqueta estática" right={<Strip />}>
          <ul className="mt-2 list-disc pl-5 text-foreground/85">
            <li><strong>Launch:</strong> auto‑servicio con guía fuerte para llegar a valor rápido.</li>
            <li><strong>Growth:</strong> formar hábito y estabilidad antes de empujar upsell.</li>
            <li><strong>Scale:</strong> control y rendimiento porque ya duele fallar.</li>
            <li><strong>Strategic:</strong> proteger y expandir valor crítico.</li>
          </ul>
          <p className="mt-3">
            Con la curva de concentración a la vista, la pregunta clave es <strong>en qué etapa va cada cliente</strong> y cómo lo movemos al
            siguiente escalón. La estrategia no es renombrar Lite/Core, es diseñar el flujo entre etapas.
          </p>
        </Section>

        <Section
          kicker="Capítulo 4"
          title="Dónde medimos y dónde capturamos valor"
          right={
            <Card>
              <div className="text-sm font-medium">Regla simple</div>
              <div className="mt-2 text-sm text-foreground/85">
                En Launch y Growth medimos avance; en Scale y Strategic capturamos valor y lo cuidamos.
              </div>
            </Card>
          }
        >
          <p className="text-base text-foreground/85 mb-4">
            Hoy Lite y Core miran los mismos KPIs. Eso mezcla objetivos de arranque con objetivos de captura. <strong>Las métricas deben seguir la etapa</strong>:
            primero uso y progreso, luego ingreso y retención de valor.
          </p>
          <div className="grid gap-3 md:grid-cols-4">
            <Card>
              <div className="text-sm font-semibold">Launch</div>
              <div className="mt-1 text-sm text-muted-foreground">Quitar fricción y lograr primer valor.</div>
            </Card>
            <Card>
              <div className="text-sm font-semibold">Growth</div>
              <div className="mt-1 text-sm text-muted-foreground">Crear hábito; aún sin capturar valor.</div>
            </Card>
            <Card>
              <div className="text-sm font-semibold">Scale</div>
              <div className="mt-1 text-sm text-muted-foreground">Estabilidad y performance; empieza la captura.</div>
            </Card>
            <Card>
              <div className="text-sm font-semibold">Strategic</div>
              <div className="mt-1 text-sm text-muted-foreground">Proteger y ampliar el valor ya capturado.</div>
            </Card>
          </div>
        </Section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">Cierre</div>
                <div className="mt-1 text-2xl font-semibold">¿Qué cambiaríamos mañana?</div>
              </div>
              <Pill>Piloto 30 días</Pill>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="font-semibold">Producto</div>
                <div className="mt-1 text-sm text-foreground/85">Eliminar fricción en Launch, habilitar puentes a Growth.</div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="font-semibold">Growth</div>
                <div className="mt-1 text-sm text-foreground/85">Medir supervivencia y hábito temprano, no solo revenue inicial.</div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="font-semibold">Foco operativo</div>
                <div className="mt-1 text-sm text-foreground/85">Auto‑servicio fuerte en Launch; acompañamiento selectivo en Growth y arriba.</div>
              </div>
            </div>
            <div className="mt-5 text-sm text-muted-foreground">
              Próximo paso: clasificar la base por etapa con señales de uso y facturación, y medir el cambio en 30 días.
            </div>
          </Card>
        </section>
      </motion.div>
    </div>
  );
}
