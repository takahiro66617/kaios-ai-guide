import { useKaios, KaizenItem, EvalAxis } from "@/contexts/KaiosContext";

const TYPE_COLORS = {
  fixed:    { lo: "bg-blue-50 border-blue-200 text-blue-700",   hi: "bg-blue-100 border-blue-300 text-blue-800" },
  strategic:{ lo: "bg-pink-50 border-pink-200 text-pink-700",   hi: "bg-pink-100 border-pink-300 text-pink-800" },
  cultural: { lo: "bg-amber-50 border-amber-200 text-amber-700", hi: "bg-amber-100 border-amber-300 text-amber-800" },
  legacy:   { lo: "bg-gray-50 border-gray-200 text-gray-400",   hi: "bg-gray-100 border-gray-300 text-gray-500" },
};

function calcAxisScore(item: KaizenItem, axis: EvalAxis, totalWeight: number): number {
  let s = Math.round(item.impactScore * (axis.weight / totalWeight));
  switch (axis.key) {
    case "essence":
      if ((item.problem?.length ?? 0) + (item.cause?.length ?? 0) > 200) s += 8;
      break;
    case "profitability":
      if ((item.numericalEvidence?.length ?? 0) > 10) s += 8;
      if ((item.effect?.length ?? 0) > 50) s += 4;
      break;
    case "feasibility":
      if ((item.solution?.length ?? 0) > 100) s += 8;
      if (item.executionStage === "実行済み") s += 12;
      else if (item.executionStage === "実行予定") s += 5;
      break;
    default:
      if (axis.axisType === "cultural" && item.adoptedBy?.length > 0) s += 8;
  }
  return Math.max(0, Math.min(100, s));
}

interface Props {
  item: KaizenItem;
  className?: string;
}

export const AxisScoreTags = ({ item, className = "" }: Props) => {
  const { evalAxes } = useKaios();
  const active = evalAxes.filter(a => a.isActive && a.axisType !== "legacy");
  if (active.length === 0) return null;

  const total = active.reduce((s, a) => s + a.weight, 0);
  if (total === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {active.map(axis => {
        const score = calcAxisScore(item, axis, total);
        const { lo, hi } = TYPE_COLORS[axis.axisType] ?? TYPE_COLORS.legacy;
        return (
          <span
            key={axis.key}
            title={axis.description}
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium border ${score >= 70 ? hi : lo}`}
          >
            {axis.name}<span className="font-bold ml-0.5">{score}</span>
          </span>
        );
      })}
    </div>
  );
};
