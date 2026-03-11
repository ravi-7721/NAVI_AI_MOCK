import Image from "next/image";

import { getTechLogos } from "@/lib/utils";

const DisplayTechIcons = async ({ techStack }: TechIconProps) => {
  const techIcons = await getTechLogos(techStack);

  return (
    <div className="flex flex-wrap gap-2">
      {techIcons.slice(0, 8).map(({ tech, url }) => (
        <div
          key={`${tech}-${url}`}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-dark-300 px-3 py-2"
        >
          <Image
            src={url}
            alt={tech}
            width={20}
            height={20}
            className="size-5 shrink-0"
          />
          <span className="text-xs font-medium text-light-100">{tech}</span>
        </div>
      ))}
    </div>
  );
};

export default DisplayTechIcons;
