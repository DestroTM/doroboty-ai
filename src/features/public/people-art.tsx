import people640 from "@/assets/illustrations/people-640.webp";
import people1000 from "@/assets/illustrations/people-1000.webp";

/**
 * Poster People illustration served as resized WebP variants instead of the
 * 1.5 MB kit PNG. `sizes` must describe the caller's rendered CSS width.
 */
export function PeopleArt({
  className,
  sizes,
  alt = "Dwie osoby pracujące razem z laptopem",
  loading,
}: {
  className?: string;
  sizes: string;
  alt?: string;
  loading?: "lazy";
}) {
  return (
    <img
      className={className}
      src={people1000}
      srcSet={`${people640} 640w, ${people1000} 1000w`}
      sizes={sizes}
      width={1000}
      height={667}
      decoding="async"
      loading={loading}
      alt={alt}
    />
  );
}
