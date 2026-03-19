"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Slide = {
  id: number;
  image: string;
  alt: string;
  href?: string;
};

const slides: Slide[] = [
  { id: 1, image: "/ads/ad1.jpg", alt: "English Time campaign 1" },
  { id: 2, image: "/ads/ad2.jpg", alt: "English Time campaign 2" },
  { id: 3, image: "/ads/ad3.jpg", alt: "English Time campaign 3" },
  { id: 4, image: "/ads/ad4.jpg", alt: "English Time campaign 4" },
];

export default function HeroAdsSlider() {
  const [current, setCurrent] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);

    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const itemsPerView = isMobile ? 1 : 2;

  const maxStartIndex = useMemo(() => {
    return Math.max(0, slides.length - itemsPerView);
  }, [itemsPerView]);

  const safeCurrent = Math.min(current, maxStartIndex);

  useEffect(() => {
    setCurrent((prev) => Math.min(prev, maxStartIndex));
  }, [maxStartIndex]);

  useEffect(() => {
    if (slides.length <= itemsPerView) return;

    const timer = setInterval(() => {
      setCurrent((prev) => {
        const next = prev + itemsPerView;
        return next > maxStartIndex ? 0 : next;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [itemsPerView, maxStartIndex]);

  const goPrev = () => {
    setCurrent((prev) => {
      const next = prev - itemsPerView;
      return next < 0 ? maxStartIndex : next;
    });
  };

  const goNext = () => {
    setCurrent((prev) => {
      const next = prev + itemsPerView;
      return next > maxStartIndex ? 0 : next;
    });
  };

  const visibleSlides = slides.slice(safeCurrent, safeCurrent + itemsPerView);

  return (
    <div className="relative w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleSlides.map((slide) => {
          const content = (
            <div className="relative h-[220px] sm:h-[280px] md:h-[320px] lg:h-[360px] overflow-hidden rounded-[28px] border border-black/10 bg-black">
              <Image
                src={slide.image}
                alt={slide.alt}
                fill
                priority={slide.id <= 2}
                className="object-cover"
              />
            </div>
          );

          if (slide.href) {
            return (
              <a key={slide.id} href={slide.href} className="block">
                {content}
              </a>
            );
          }

          return <div key={slide.id}>{content}</div>;
        })}
      </div>

      {slides.length > itemsPerView && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/90 text-black shadow transition hover:bg-white"
            aria-label="Previous"
          >
            ‹
          </button>

          <button
            onClick={goNext}
            className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/90 text-black shadow transition hover:bg-white"
            aria-label="Next"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}