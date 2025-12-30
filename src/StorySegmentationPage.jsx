import React, { useMemo, useState, useEffect } from "react";
import {
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";
import { motion } from "framer-motion";

// Tailwind assumed. Drop this file into a Vite/React app and render <StorySegmentationPage />.

const formatPct = (n) => `${Math.round(n)}%`;

// Curva suave convexa: y = (exp(beta*x) - 1) / (exp(beta) - 1), calibrada para que 60% clientes ≈ 40% revenue.
// Además generamos un histograma sintético altamente sesgado (muchos bajos, pocos altos).
function buildCustomerSample({ liteShare = 0.6, targetLiteRevenue = 40, points = 101, histogramBins = 12 }) {
  const targetY = targetLiteRevenue / 100;

  // Resolvemos beta por búsqueda binaria para que f(liteShare) ≈ targetY.
  const solveBeta = () => {
    let lo = 0.01;
    let hi = 6;
    const f = (b) => (Math.exp(b * liteShare) - 1) / (Math.exp(b) - 1);
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const v = f(mid);
      // f(b) es monótonamente decreciente: a mayor beta, más curvatura y menor share en Lite.
      // Si estamos por debajo del objetivo, beta es demasiado alta -> bajamos hi.
      if (v < targetY) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  };

  const beta = solveBeta();
  const fn = (p) => ((Math.exp(beta * p) - 1) / (Math.exp(beta) - 1)) * 100;

  const curve = Array.from({ length: points }, (_, i) => {
    const p = (i / (points - 1));
    return { p: p * 100, cumShare: fn(p) };
  });

  const liteRevenuePct = fn(liteShare);
  const coreRevenuePct = 100 - liteRevenuePct;

  // Serie simple: acumulación de revenue mes a mes para un usuario/cohorte (100% = lo generado en 12 meses).
  const months = 12;
  const monthly = [];
  let mrr = 100;
  let rate = 0.15; // crecimiento mensual inicial
  const decay = 0.92; // se desacelera suavemente
  let total = 0;
  for (let i = 0; i < months; i++) {
    mrr *= 1 + rate;
    total += mrr;
    rate *= decay;
    monthly.push({ month: i + 1, cumulativePct: 0 }); // se rellena abajo
  }
  let cumulative = 0;
  mrr = 100;
  rate = 0.15;
  for (let i = 0; i < months; i++) {
    mrr *= 1 + rate;
    cumulative += mrr;
    monthly[i].cumulativePct = (cumulative / total) * 100;
    rate *= decay;
  }

  // Histograma sintético (no monetario) para mostrar “muchos pequeños, pocos grandes”
  const histogram = [];
  let count = 520;
  let bucket = 50; // valor de referencia de revenue de factura
  const histDecay = 0.55;
  const growth = 1.55;
  for (let i = 0; i < histogramBins; i++) {
    histogram.push({
      bucket: `${Math.round(bucket)}`,
      count: Math.max(1, Math.round(count)),
    });
    count *= histDecay;
    bucket *= growth;
  }

  return { curve, liteRevenuePct, coreRevenuePct, monthly, histogram };
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

function HistogramChart({ data }) {
  const safe = Array.isArray(data) && data.length ? data : [];
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Cómo se reparte el revenue por cliente</div>
        <Pill>Distribución</Pill>
      </div>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={safe} margin={{ top: 12, right: 12, left: 0, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
            <XAxis
              dataKey="bucket"
              label={{ value: "Revenue por cliente (bins)", position: "insideBottom", offset: -8 }}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              label={{ value: "Cantidad de clientes", angle: -90, position: "insideLeft", offset: 4 }}
            />
            <Tooltip
              formatter={(v) => `${v} clientes`}
              labelFormatter={(l) => `Bin: ${l}`}
              contentStyle={{ borderRadius: 12, borderColor: "var(--border)", fontSize: 12 }}
            />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        Muchos clientes facturan muy poco; unos pocos concentran casi todo. El histograma cae rápido y roza cero al final.
      </div>
    </Card>
  );
}

function MomentumChart({ monthly }) {
  const safe = Array.isArray(monthly) ? monthly : [];
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Acumulación mensual por usuario</div>
        <Pill>12 meses</Pill>
      </div>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={safe} margin={{ top: 12, bottom: 10, left: 6, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
            <XAxis dataKey="month" tickFormatter={(v) => `M${v}`} label={{ value: "Mes", position: "insideBottom", offset: -4 }} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${Math.round(v)}%`}
              label={{ value: "Revenue acumulado (usuario 12m = 100%)", angle: -90, position: "insideLeft", offset: 6 }}
            />
            <Tooltip
              formatter={(v) => `${Math.round(v)}%`}
              labelFormatter={(l) => `Mes ${l}`}
            />
            <Line type="monotone" dataKey="cumulativePct" name="Acumulado" strokeWidth={2.6} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Cada punto: porcentaje del revenue de 12 meses que ya generó un usuario promedio. Llega a 100% en el mes 12, mostrando que el valor se acumula de forma creciente y se aplana hacia el final.
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

  const { curve, liteRevenuePct, coreRevenuePct, monthly, histogram } = useMemo(
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
            <Pill>Datos sintéticos suavizados</Pill>
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
          right={<HistogramChart data={histogram} />}
        >
          <p>
            El plan original fue: auto‑servicio para el tramo grande y foco para el tramo core. Suena bien si cada tramo fuera parejo. Pero en el
            tramo masivo conviven clientes que apenas empiezan con otros que ya valen mucho.
          </p>
          <p className="mt-3">
            El 60% de clientes ya acumulamos ~40% del revenue. “Lite” no es un bloque de bajo valor; es mezcla.
            Decidir “para Lite” es manejar el 40% del ingreso con una sola regla.
          </p>
        </Section>

        <Section
          kicker="Capítulo 2"
          title="El valor de una cohorte crece por multiplicación, no por sumas lineales"
          right={<MomentumChart monthly={monthly} />}
        >
          <p>
            Un usuario no aporta 1/12 del ingreso cada mes: empieza pequeño, gana tracción y luego se estabiliza. El año es la suma de ese recorrido
            compuesto.
          </p>
          <p className="mt-3">
            Mirar la curva acumulada muestra dónde empujar: si alguien no acelera en los primeros meses, es improbable que llegue a la zona de valor.
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
