import Image from "next/image";
const sequence = [
  1, 5, 9, 3, 12, 7, 10, 2, 14, 6, 4, 11, 8, 13, 3, 7, 1, 10, 5, 14, 9, 2, 11,
  6,
];
export function PosterWall({ urls }: { urls: string[] }) {
  return (
    <div className="poster-wall" aria-hidden="true">
      {urls.length > 0 &&
        sequence.map((n, i) => (
          <div className={`wall-tile tile-${i % 8}`} key={i}>
            <Image
              src={urls[(n - 1) % urls.length]}
              alt=""
              fill
              sizes="(max-width: 600px) 67vw, 34vw"
              priority={i < 4}
              style={{
                objectFit: "cover",
                objectPosition: i % 3 === 0 ? "50% 30%" : "50% 50%",
              }}
            />
          </div>
        ))}
    </div>
  );
}
