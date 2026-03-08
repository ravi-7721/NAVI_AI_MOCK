import Image from "next/image";

interface StarRatingProps {
  score: number; // 0-100
  maxStars?: number;
}

const StarRating = ({ score, maxStars = 5 }: StarRatingProps) => {
  // convert score out of 100 to stars
  const filled = Math.round((score / 100) * maxStars);
  const stars = [];

  for (let i = 0; i < maxStars; i++) {
    stars.push(
      <Image
        key={i}
        src="/star.svg"
        width={20}
        height={20}
        alt="star"
        className={i < filled ? "opacity-100" : "opacity-30"}
      />,
    );
  }

  return <div className="flex gap-1">{stars}</div>;
};

export default StarRating;
