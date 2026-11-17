# Illustration variants

Resized WebP copies of the Poster People illustration
[`docs/design-system/agent-kit/assets/people.png`](../../../docs/design-system/agent-kit/assets/people.png)
(1536 × 1024 PNG, about 1.5 MB). The original stays byte-identical in the immutable kit; see its
[provenance](../../../docs/design-system/agent-kit/assets/ILLUSTRATION.md).

The app displays the illustration at most about 490 CSS px wide (128–230 px on phones), so these
variants are served through `srcset` by [PeopleArt](../../features/public/people-art.tsx).

Regenerate with cwebp 1.5.0 from the repository root:

```sh
for w in 640 1000; do
  cwebp -q 82 -alpha_q 90 -resize $w 0 docs/design-system/agent-kit/assets/people.png \
    -o src/assets/illustrations/people-$w.webp
done
```
