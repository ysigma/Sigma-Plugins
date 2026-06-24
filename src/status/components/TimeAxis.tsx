import { formatTick, tickIndices } from "../lib/time";

interface Props {
  buckets: number[];
  bucketMs: number;
}

/**
 * Tick labels under the timeline. Each tick is positioned at the horizontal
 * center of its bucket so the labels line up with the squares above (the track
 * lays cells out with `flex: 1 1 0`, i.e. evenly).
 */
export default function TimeAxis({ buckets, bucketMs }: Props) {
  const count = buckets.length;
  if (count === 0) return null;
  const indices = tickIndices(count);

  return (
    <div className="sst-axis-track">
      {indices.map((i) => {
        const centerPct = ((i + 0.5) / count) * 100;
        return (
          <span
            key={i}
            className="sst-tick"
            style={{ left: `${centerPct}%` }}
          >
            {formatTick(buckets[i], bucketMs)}
          </span>
        );
      })}
    </div>
  );
}
