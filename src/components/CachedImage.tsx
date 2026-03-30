import React from 'react';

type CachedImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
  wrapperClassName?: string;
  imgClassName?: string;
  skeletonClassName?: string;
  fallbackSrc?: string;
};

const loadedImageUrls = new Set<string>();
const pendingImageLoads = new Map<string, Promise<void>>();

function preloadImage(src: string): Promise<void> {
  if (loadedImageUrls.has(src)) return Promise.resolve();
  const pending = pendingImageLoads.get(src);
  if (pending) return pending;

  const promise = new Promise<void>((resolve, reject) => {
    const image = new window.Image();
    image.decoding = 'async';
    image.onload = () => {
      loadedImageUrls.add(src);
      pendingImageLoads.delete(src);
      resolve();
    };
    image.onerror = () => {
      pendingImageLoads.delete(src);
      reject(new Error(`Failed to load image: ${src}`));
    };
    image.src = src;
  });

  pendingImageLoads.set(src, promise);
  return promise;
}

export function markImageAsCached(src?: string | null) {
  if (!src) return;
  loadedImageUrls.add(src);
}

export default function CachedImage({
  src,
  alt,
  className,
  wrapperClassName,
  imgClassName,
  skeletonClassName,
  fallbackSrc,
  loading = 'lazy',
  decoding = 'async',
  ...props
}: CachedImageProps) {
  const resolvedSrc = src || fallbackSrc;
  const [activeSrc, setActiveSrc] = React.useState(resolvedSrc);
  const [isLoaded, setIsLoaded] = React.useState(() => (resolvedSrc ? loadedImageUrls.has(resolvedSrc) : false));

  React.useEffect(() => {
    setActiveSrc(resolvedSrc);
    setIsLoaded(resolvedSrc ? loadedImageUrls.has(resolvedSrc) : false);

    if (!resolvedSrc || typeof window === 'undefined' || loadedImageUrls.has(resolvedSrc)) {
      return;
    }

    let cancelled = false;
    preloadImage(resolvedSrc)
      .then(() => {
        if (!cancelled) setIsLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        if (fallbackSrc && fallbackSrc !== resolvedSrc) {
          setActiveSrc(fallbackSrc);
          setIsLoaded(loadedImageUrls.has(fallbackSrc));
          preloadImage(fallbackSrc)
            .then(() => {
              if (!cancelled) setIsLoaded(true);
            })
            .catch(() => {
              if (!cancelled) setIsLoaded(true);
            });
          return;
        }
        setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedSrc, fallbackSrc]);

  if (!activeSrc) {
    return <div aria-hidden="true" className={wrapperClassName || className} />;
  }

  return (
    <div className={`relative overflow-hidden bg-gray-100 ${wrapperClassName || className || ''}`}>
      {!isLoaded && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 animate-pulse bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 ${skeletonClassName || ''}`}
        />
      )}
      <img
        {...props}
        src={activeSrc}
        alt={alt}
        loading={loading}
        decoding={decoding}
        className={`${imgClassName || className || ''} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={(event) => {
          loadedImageUrls.add(activeSrc);
          setIsLoaded(true);
          props.onLoad?.(event);
        }}
        onError={(event) => {
          if (fallbackSrc && activeSrc !== fallbackSrc) {
            setActiveSrc(fallbackSrc);
            setIsLoaded(loadedImageUrls.has(fallbackSrc));
          } else {
            setIsLoaded(true);
          }
          props.onError?.(event);
        }}
      />
    </div>
  );
}
