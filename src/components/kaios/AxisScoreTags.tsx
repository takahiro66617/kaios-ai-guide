import { useKaios, KaizenItem, EvalAxis } from "@/contexts/KaiosContext";

const TYPE_COLORS = {
  fixed:    { lo: "bg-blue-50 border-blue-200 text-blue-700",   hi: "bg-blue-100 border-blue-300 text-blue-800" },
  strategic:{ lo: "bg-pink-50 border-pink-200 text-pink-700",   hi: "bg-pink-100 border-pink-300 text-pink-800" },
  cultural: { lo: "bg-amber-50 border-amber-200 text-amber-700", hi: "bg-amber-100 border-amber-300 text-amber-800" },
  legacy:   { lo: "bg-gray-50 border-gray-200 text-gray-400",   hi: "bg-gray-100 border-gray-300 text-gray-500" },
};

/**
 * 軸ごとの素点（0〜該当軸のウェイト点）を返す。
 * 1) AIが評価方針に沿って付けた per_axis_scores があればそれを使う
 * 2) 無い場合は総合点をウェイト比で按分するフォールバック
 */
function calcAxisRawScore(item: KaizenItem, axis: EvalAxis, totalWeight: number): number {
  const weight = axis.weight || 1;
  const saved = item.perAxisScores?.find(s => s.key === axis.key);
  if (saved && typeof saved.score === "number") {
    return Math.max(0, Math.min(weight, Math.round(saved.score)));
  }
  // フォールバック: 総合点(0-100) × ウェイト比 を該当軸の満点スケールに換算
  const fallback = Math.round(item.impactScore * (weight / totalWeight));
  return Math.max(0, Math.min(weight, fallback));
}

interface Props {
  item: KaizenItem;
  className?: string;
}

export const AxisScoreTags = ({ item, className = "" }: Props) => {
  const { evalAxes } = useKaios();
  const active = evalAxes.filter(a => a.isActive);
  if (active.length === 0) return null;

  const total = active.reduce((s, a) => s + a.weight, 0);
  if (total === 0) return null;

  const hasSaved = (item.perAxisScores?.length ?? 0) > 0;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {active.map(axis => {
        const score = calcAxisRawScore(item, axis, total);
        const weight = axis.weight || 1;
        const ratio = score / weight; // 0〜1
        const { lo, hi } = TYPE_COLORS[axis.axisType] ?? TYPE_COLORS.legacy;
        const tip = hasSaved
          ? `${axis.description}\n（AIが評価方針に沿って採点｜満点 ${weight} 点）`
          : `${axis.description}\n（参考値: 軸別採点が未保存のため、総合点から按分｜満点 ${weight} 点）`;
        return (
          <span
            key={axis.key}
            title={tip}
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium border ${ratio >= 0.7 ? hi : lo}`}
          >
            {axis.name}
            <span className="font-bold ml-0.5">{score}/{weight}</span>
            <span className="ml-0.5">点</span>
          </span>
        );
      })}
    </div>
  );
};
